import { CONFIG } from "./lib.js";

const RETRYABLE_GOOGLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const GOOGLE_REQUEST_RETRY_MS = [125, 400];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableCalendarError(error) {
  const status = Number(error?.status || 0);
  if (RETRYABLE_GOOGLE_STATUSES.has(status)) return true;
  return (
    ["google_calendar_broker_token_failed", "google_calendar_oauth_refresh_failed"].includes(error?.code) &&
    (status === 0 || status === 429 || status >= 500)
  );
}

export function calendarRepairDelayMs(attempt) {
  const schedule = [2_000, 10_000, 30_000, 120_000, 600_000];
  const index = Math.max(0, Math.min(schedule.length - 1, Number(attempt || 1) - 1));
  return schedule[index];
}

function calendarId(env) {
  return String(env.GOOGLE_CALENDAR_ID || "primary").trim() || "primary";
}

function brokerConfigured(env) {
  return Boolean(env.AUTH_BROKER && env.GOOGLE_DELEGATED_BRIDGE_SECRET);
}

function directRefreshConfigured(env) {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_DELEGATED_REFRESH_TOKEN
  );
}

export function googleCalendarConfigured(env) {
  return brokerConfigured(env) || directRefreshConfigured(env);
}

async function brokerAccessToken(env) {
  const response = await env.AUTH_BROKER.fetch("https://auth.clintware.com/internal/google-access-token", {
    method: "POST",
    headers: {
      "x-clintware-google-secret": env.GOOGLE_DELEGATED_BRIDGE_SECRET,
      accept: "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(response.status === 404 ? "google_calendar_not_connected" : "google_calendar_broker_token_failed");
    error.code = response.status === 404 ? "google_calendar_not_connected" : "google_calendar_broker_token_failed";
    error.status = response.status;
    error.detail = String(data.error || data.message || "").slice(0, 240);
    throw error;
  }
  return data.access_token;
}

async function directAccessToken(env) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_DELEGATED_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error("google_calendar_oauth_refresh_failed");
    error.code = "google_calendar_oauth_refresh_failed";
    error.status = response.status;
    error.detail = String(data.error || data.error_description || "").slice(0, 240);
    throw error;
  }
  return data.access_token;
}

async function accessToken(env) {
  if (brokerConfigured(env)) {
    try {
      return await brokerAccessToken(env);
    } catch (error) {
      if (!directRefreshConfigured(env)) throw error;
      console.warn(JSON.stringify({
        event: "google_calendar_broker_fallback",
        code: error.code || "broker_error",
        status: error.status || 0,
      }));
    }
  }
  if (directRefreshConfigured(env)) return directAccessToken(env);

  const error = new Error("google_calendar_not_configured");
  error.code = "google_calendar_not_configured";
  throw error;
}

async function googleJson(env, url, init = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const token = await accessToken(env);
      const headers = new Headers(init.headers || {});
      headers.set("authorization", `Bearer ${token}`);
      if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
      const response = await fetch(url, { ...init, headers });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
      if (!response.ok) {
        const error = new Error(`google_calendar_request_failed:${response.status}`);
        error.code = "google_calendar_request_failed";
        error.status = response.status;
        error.detail = JSON.stringify(data).slice(0, 800);
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= GOOGLE_REQUEST_RETRY_MS.length || !isRetryableCalendarError(error)) throw error;
      await sleep(GOOGLE_REQUEST_RETRY_MS[attempt]);
    }
  }
  throw lastError;
}

export async function googleBusyIntervals(env, fromMs, toMs) {
  if (!googleCalendarConfigured(env)) return [];
  const data = await googleJson(env, "https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: new Date(fromMs).toISOString(),
      timeMax: new Date(toMs).toISOString(),
      timeZone: CONFIG.hostTimeZone,
      items: [{ id: calendarId(env) }],
    }),
  });
  const calendars = data.calendars || {};
  const entry = calendars[calendarId(env)] || calendars.primary || Object.values(calendars)[0] || {};
  if (Array.isArray(entry.errors) && entry.errors.length) {
    const error = new Error("google_calendar_freebusy_failed");
    error.code = "google_calendar_freebusy_failed";
    error.detail = JSON.stringify(entry.errors).slice(0, 800);
    throw error;
  }
  return (entry.busy || []).map((item) => ({
    startMs: Date.parse(item.start),
    endMs: Date.parse(item.end),
  })).filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs));
}

export async function probeGoogleCalendar(env) {
  if (!googleCalendarConfigured(env)) {
    const error = new Error("google_calendar_not_configured");
    error.code = "google_calendar_not_configured";
    throw error;
  }
  const now = Date.now();
  await googleBusyIntervals(env, now, now + 60_000);
  return { ok: true, checkedAt: now };
}

export function filterSlotsAgainstGoogleBusy(slots, busy, config = CONFIG) {
  const before = config.bufferBeforeMinutes * 60_000;
  const after = config.bufferAfterMinutes * 60_000;
  return slots.filter((slot) => !busy.some((item) =>
    slot.startMs < item.endMs + after && slot.endMs > item.startMs - before
  ));
}

export function requestedTimeIsGoogleBusy(startMs, endMs, busy, config = CONFIG) {
  const before = config.bufferBeforeMinutes * 60_000;
  const after = config.bufferAfterMinutes * 60_000;
  return busy.some((item) => startMs < item.endMs + after && endMs > item.startMs - before);
}

function roomUrl(booking) {
  return `${CONFIG.publicUrl}/room/${booking.roomCode}`;
}

function manageUrl(booking) {
  return `${CONFIG.publicUrl}/manage/${booking.manageToken}`;
}

export function buildGoogleCalendarEventBody(booking, { includeConference = true } = {}) {
  const room = roomUrl(booking);
  const manage = manageUrl(booking);
  const purpose = booking.purpose || "Conversation";
  const topic = booking.topic || "Conversation";
  const attendees = [{ email: booking.email, displayName: booking.name }];
  if (String(booking.email || "").toLowerCase() !== CONFIG.hostEmail.toLowerCase()) {
    attendees.push({ email: CONFIG.hostEmail, displayName: CONFIG.hostName });
  }

  const body = {
    id: String(booking.id || "").replaceAll("-", "").toLowerCase(),
    summary: `Meet with Clinton — ${booking.name}`,
    description: [
      "Scheduled through Clintware Meet.",
      `Purpose: ${purpose}`,
      `Topic: ${topic}`,
      `Backup room: ${room}`,
      `Manage booking: ${manage}`,
      `Host contact: ${CONFIG.hostEmail}`,
    ].join("\n"),
    start: {
      dateTime: new Date(booking.startMs).toISOString(),
      timeZone: CONFIG.hostTimeZone,
    },
    end: {
      dateTime: new Date(booking.endMs).toISOString(),
      timeZone: CONFIG.hostTimeZone,
    },
    attendees,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    reminders: { useDefault: true },
    extendedProperties: {
      private: {
        clintwareBookingId: booking.id,
        clintwareManageUrl: manage,
        clintwareBackupRoom: room,
      },
    },
  };

  if (includeConference) {
    body.conferenceData = {
      createRequest: {
        requestId: `clintware-${String(booking.id || "").replaceAll("-", "").toLowerCase()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return body;
}

export async function createGoogleCalendarEvent(env, booking) {
  const id = String(booking.id || "").replaceAll("-", "").toLowerCase();
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId(env))}/events`;
  const url = `${base}?conferenceDataVersion=1&sendUpdates=all`;
  try {
    const event = await googleJson(env, url, {
      method: "POST",
      body: JSON.stringify(buildGoogleCalendarEventBody(booking)),
    });
    return { id: event.id || id, htmlLink: event.htmlLink || "", hangoutLink: event.hangoutLink || "", status: event.status || "confirmed" };
  } catch (error) {
    if (error.status !== 409) throw error;
    const existing = await googleJson(env, `${base}/${encodeURIComponent(id)}?conferenceDataVersion=1`);
    return { id: existing.id || id, htmlLink: existing.htmlLink || "", hangoutLink: existing.hangoutLink || "", status: existing.status || "confirmed" };
  }
}

export async function updateGoogleCalendarEvent(env, booking) {
  if (!booking.googleEventId) return null;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId(env))}/events/${encodeURIComponent(booking.googleEventId)}?conferenceDataVersion=1&sendUpdates=all`;
  const body = buildGoogleCalendarEventBody(booking, { includeConference: false });
  delete body.id;
  const event = await googleJson(env, url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { id: event.id || booking.googleEventId, htmlLink: event.htmlLink || "", hangoutLink: event.hangoutLink || "", status: event.status || "confirmed" };
}

export async function getGoogleCalendarEvent(env, booking) {
  if (!booking.googleEventId) return null;
  const event = await googleJson(
    env,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId(env))}/events/${encodeURIComponent(booking.googleEventId)}?conferenceDataVersion=1`
  );
  return {
    id: event.id || booking.googleEventId,
    htmlLink: event.htmlLink || "",
    hangoutLink: event.hangoutLink || "",
    status: event.status || "confirmed",
  };
}

export async function deleteGoogleCalendarEvent(env, booking) {
  if (!booking.googleEventId) return false;
  const token = await accessToken(env);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId(env))}/events/${encodeURIComponent(booking.googleEventId)}?sendUpdates=all`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (response.status === 404 || response.status === 410) return true;
  if (!response.ok) {
    const error = new Error(`google_calendar_delete_failed:${response.status}`);
    error.code = "google_calendar_delete_failed";
    error.status = response.status;
    error.detail = (await response.text().catch(() => "")).slice(0, 800);
    throw error;
  }
  return true;
}
