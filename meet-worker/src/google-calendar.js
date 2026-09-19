const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function required(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export function calendarConfigured(env) {
  return Boolean(
    String(env?.GOOGLE_CALENDAR_CLIENT_ID || "").trim() &&
    String(env?.GOOGLE_CALENDAR_CLIENT_SECRET || "").trim() &&
    String(env?.GOOGLE_CALENDAR_REFRESH_TOKEN || "").trim() &&
    String(env?.GOOGLE_CALENDAR_ID || "").trim()
  );
}

async function accessToken(env) {
  const body = new URLSearchParams({
    client_id: required(env, "GOOGLE_CALENDAR_CLIENT_ID"),
    client_secret: required(env, "GOOGLE_CALENDAR_CLIENT_SECRET"),
    refresh_token: required(env, "GOOGLE_CALENDAR_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error("google_oauth_refresh_failed");
    error.status = response.status;
    error.detail = data.error_description || data.error || "";
    throw error;
  }
  return data.access_token;
}

async function googleFetch(env, path, init = {}) {
  const token = await accessToken(env);
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${CALENDAR_API}${path}`, { ...init, headers });
  if (response.status === 204) return { response, data: null };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "google_calendar_request_failed");
    error.status = response.status;
    error.reason = data?.error?.errors?.[0]?.reason || "";
    error.google = data;
    throw error;
  }
  return { response, data };
}

function calendarPath(env) {
  return encodeURIComponent(required(env, "GOOGLE_CALENDAR_ID"));
}

function eventPath(env, eventId) {
  return `/calendars/${calendarPath(env)}/events/${encodeURIComponent(eventId)}`;
}

function iso(ms) {
  return new Date(Number(ms)).toISOString();
}

function descriptionFor(booking) {
  const manageUrl = `${booking.publicUrl || "https://meet.clintware.com"}/manage/${booking.manageToken}`;
  const lines = [
    booking.topic ? `Discussion: ${booking.topic}` : "",
    booking.company ? `Company: ${booking.company}` : "",
    booking.purpose ? `Purpose: ${booking.purpose}` : "",
    "",
    `Manage booking: ${manageUrl}`,
    "",
    "Scheduled through Clintware Meet.",
  ];
  return lines.filter((line, index) => line || index >= 3).join("\n").trim();
}

function eventBody(booking, includeConference = false) {
  const body = {
    summary: `Clinton Kosh + ${booking.name}`,
    description: descriptionFor(booking),
    start: { dateTime: iso(booking.startMs), timeZone: "America/Chicago" },
    end: { dateTime: iso(booking.endMs), timeZone: "America/Chicago" },
    attendees: [{ email: booking.email, displayName: booking.name }],
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: true,
    reminders: { useDefault: true },
  };
  if (includeConference) {
    body.conferenceData = {
      createRequest: {
        requestId: `clintware-${String(booking.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}-${booking.sequence || 0}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  return body;
}

function meetUrlFrom(event) {
  if (event?.hangoutLink) return event.hangoutLink;
  const entry = event?.conferenceData?.entryPoints?.find((x) => x.entryPointType === "video" && x.uri);
  return entry?.uri || "";
}

export async function verifyCalendar(env) {
  if (!calendarConfigured(env)) {
    return { ok: false, configured: false, calendarId: String(env?.GOOGLE_CALENDAR_ID || "") };
  }
  try {
    const { data } = await googleFetch(env, `/calendars/${calendarPath(env)}`);
    const allowed = data?.conferenceProperties?.allowedConferenceSolutionTypes || [];
    return {
      ok: true,
      configured: true,
      calendarId: String(env.GOOGLE_CALENDAR_ID),
      summary: data?.summary || "",
      timeZone: data?.timeZone || "",
      googleMeetSupported: allowed.includes("hangoutsMeet"),
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      calendarId: String(env.GOOGLE_CALENDAR_ID || ""),
      error: String(error.message || error),
      status: error.status || 500,
    };
  }
}

export async function googleBusyWindows(env, timeMinMs, timeMaxMs) {
  if (!calendarConfigured(env)) return [];
  const { data } = await googleFetch(env, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: iso(timeMinMs),
      timeMax: iso(timeMaxMs),
      timeZone: "America/Chicago",
      items: [{ id: required(env, "GOOGLE_CALENDAR_ID") }],
    }),
  });
  const cal = data?.calendars?.[required(env, "GOOGLE_CALENDAR_ID")];
  if (cal?.errors?.length) {
    const error = new Error(cal.errors[0].reason || "google_freebusy_failed");
    error.google = cal.errors;
    throw error;
  }
  return (cal?.busy || []).map((window) => ({
    startMs: Date.parse(window.start),
    endMs: Date.parse(window.end),
  })).filter((x) => Number.isFinite(x.startMs) && Number.isFinite(x.endMs));
}

export async function createGoogleMeeting(env, booking) {
  const query = new URLSearchParams({ conferenceDataVersion: "1", sendUpdates: "all" });
  const { data } = await googleFetch(env, `/calendars/${calendarPath(env)}/events?${query}`, {
    method: "POST",
    body: JSON.stringify({
      ...eventBody(booking, true),
      id: String(booking.id).replace(/-/g, "").toLowerCase(),
    }),
  });

  let event = data;
  for (let i = 0; i < 4 && !meetUrlFrom(event); i += 1) {
    const status = event?.conferenceData?.createRequest?.status?.statusCode;
    if (status && status !== "pending") break;
    await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    const refreshed = await googleFetch(env, `${eventPath(env, event.id)}?conferenceDataVersion=1`);
    event = refreshed.data;
  }
  const meetUrl = meetUrlFrom(event);
  if (!event?.id || !meetUrl) {
    const error = new Error("google_meet_provisioning_failed");
    error.google = event;
    throw error;
  }
  return {
    eventId: event.id,
    meetUrl,
    eventUrl: event.htmlLink || "",
    organizerEmail: event.organizer?.email || "",
    conferenceStatus: event?.conferenceData?.createRequest?.status?.statusCode || "success",
  };
}

export async function updateGoogleMeeting(env, booking) {
  if (!booking.googleEventId) throw new Error("google_event_id_missing");
  const query = new URLSearchParams({ conferenceDataVersion: "1", sendUpdates: "all" });
  const { data } = await googleFetch(env, `${eventPath(env, booking.googleEventId)}?${query}`, {
    method: "PATCH",
    body: JSON.stringify(eventBody(booking, false)),
  });
  return {
    eventId: data.id,
    meetUrl: meetUrlFrom(data) || booking.googleMeetUrl || "",
    eventUrl: data.htmlLink || booking.googleEventUrl || "",
    organizerEmail: data.organizer?.email || "",
  };
}

export async function cancelGoogleMeeting(env, booking) {
  if (!booking.googleEventId) return { ok: true, alreadyMissing: true };
  try {
    await googleFetch(env, `${eventPath(env, booking.googleEventId)}?sendUpdates=all`, { method: "DELETE" });
    return { ok: true, alreadyMissing: false };
  } catch (error) {
    if (error.status === 404 || error.status === 410) return { ok: true, alreadyMissing: true };
    throw error;
  }
}
