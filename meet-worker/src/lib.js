export const CONFIG = Object.freeze({
  hostName: "Clinton Kosh",
  hostEmail: "clint@clintware.com",
  hostTimeZone: "America/Chicago",
  publicUrl: "https://meet.clintware.com",
  durationMinutes: 30,
  slotStepMinutes: 30,
  minNoticeMinutes: 120,
  horizonDays: 60,
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 15,
  maxBookingsPerDay: 10,
  workdayStart: "09:00",
  workdayEnd: "17:00",
  workingWeekdays: [1, 2, 3, 4, 5],
  reminderMinutes: [120, 5],
  followupDelayMinutes: 30,
});

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function cleanText(value, max = 500) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function createToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function readJson(request, maxBytes = 32_000) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw Object.assign(new Error("payload_too_large"), { code: "payload_too_large" });
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(new Error("payload_too_large"), { code: "payload_too_large" });
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw Object.assign(new Error("invalid_json"), { code: "invalid_json" });
  }
}

export function utcPartsInZone(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function zonedLocalToUtc(dateString, timeString, timeZone) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let i = 0; i < 4; i += 1) {
    const parts = utcPartsInZone(guess, timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const delta = desired - represented;
    guess += delta;
    if (Math.abs(delta) < 1000) break;
  }
  return guess;
}

export function hostDateString(ms, timeZone = CONFIG.hostTimeZone) {
  const p = utcPartsInZone(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function weekdayForDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export function addDays(dateString, days) {
  const [y, m, d] = dateString.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

export function generateCandidateSlots(nowMs = Date.now(), config = CONFIG) {
  const today = hostDateString(nowMs, config.hostTimeZone);
  const minStart = nowMs + config.minNoticeMinutes * 60_000;
  const endLimit = nowMs + config.horizonDays * 86_400_000;
  const slots = [];

  for (let dayOffset = 0; dayOffset <= config.horizonDays; dayOffset += 1) {
    const date = addDays(today, dayOffset);
    if (!config.workingWeekdays.includes(weekdayForDate(date))) continue;
    const dayStart = zonedLocalToUtc(date, config.workdayStart, config.hostTimeZone);
    const dayEnd = zonedLocalToUtc(date, config.workdayEnd, config.hostTimeZone);
    for (let start = dayStart; start + config.durationMinutes * 60_000 <= dayEnd; start += config.slotStepMinutes * 60_000) {
      if (start < minStart || start > endLimit) continue;
      slots.push({ startMs: start, endMs: start + config.durationMinutes * 60_000, hostDate: date });
    }
  }
  return slots;
}

export function overlaps(startA, endA, startB, endB, beforeMs = 0, afterMs = 0) {
  return startA < endB + afterMs && endA > startB - beforeMs;
}

export function filterAvailableSlots(candidates, busy, config = CONFIG) {
  const beforeMs = config.bufferBeforeMinutes * 60_000;
  const afterMs = config.bufferAfterMinutes * 60_000;
  const counts = new Map();
  for (const row of busy) {
    if (row.status !== "confirmed") continue;
    counts.set(row.hostDate, (counts.get(row.hostDate) || 0) + 1);
  }
  return candidates.filter((slot) => {
    if ((counts.get(slot.hostDate) || 0) >= config.maxBookingsPerDay) return false;
    return !busy.some((row) => row.status === "confirmed" && overlaps(slot.startMs, slot.endMs, row.startMs, row.endMs, beforeMs, afterMs));
  });
}

export function validateRequestedStart(startMs, nowMs = Date.now(), config = CONFIG) {
  if (!Number.isFinite(startMs)) return false;
  return generateCandidateSlots(nowMs, config).some((slot) => slot.startMs === startMs);
}

export function formatDateTime(ms, timeZone, options = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: options.weekday ?? "long",
    month: options.month ?? "long",
    day: options.day ?? "numeric",
    year: options.year ?? "numeric",
    hour: options.hour ?? "numeric",
    minute: options.minute ?? "2-digit",
    timeZoneName: options.timeZoneName ?? "short",
  }).format(new Date(ms));
}

export function formatTime(ms, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(ms));
}

export function icsStamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(booking, method = "REQUEST") {
  const manage = `${CONFIG.publicUrl}/manage/${booking.manageToken}`;
  const room = `${CONFIG.publicUrl}/room/${booking.roomCode}`;
  const description = `Topic: ${booking.topic || "Conversation"}\\nManage: ${manage}\\nVideo room: ${room}`;
  const status = method === "CANCEL" ? "CANCELLED" : "CONFIRMED";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clintware//ClintCal//EN",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@meet.clintware.com`,
    `SEQUENCE:${booking.sequence || 0}`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(booking.startMs)}`,
    `DTEND:${icsStamp(booking.endMs)}`,
    `SUMMARY:${icsEscape(`Meet with Clinton — ${booking.name}`)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(room)}`,
    `URL:${icsEscape(manage)}`,
    `STATUS:${status}`,
    "ORGANIZER;CN=Clinton Kosh:mailto:clint@clintware.com",
    `ATTENDEE;CN=${icsEscape(booking.name)};RSVP=TRUE:mailto:${booking.email}`,
    "ATTENDEE;CN=Clinton Kosh;RSVP=TRUE:mailto:clint@clintware.com",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function googleCalendarUrl(booking) {
  const room = `${CONFIG.publicUrl}/room/${booking.roomCode}`;
  const manage = `${CONFIG.publicUrl}/manage/${booking.manageToken}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Meet with Clinton — ${booking.name}`,
    dates: `${icsStamp(booking.startMs)}/${icsStamp(booking.endMs)}`,
    details: `Topic: ${booking.topic || "Conversation"}\nManage: ${manage}`,
    location: room,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function bookingPublic(booking) {
  const legacyRoomUrl = booking.roomCode ? `${CONFIG.publicUrl}/room/${booking.roomCode}` : "";
  const meetUrl = booking.googleMeetUrl || legacyRoomUrl;
  return {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    company: booking.company || "",
    purpose: booking.purpose || "",
    topic: booking.topic || "",
    startMs: booking.startMs,
    endMs: booking.endMs,
    timezone: booking.timezone,
    status: booking.status,
    sequence: booking.sequence || 0,
    meetUrl,
    roomUrl: meetUrl,
    googleEventUrl: booking.googleEventUrl || "",
    manageUrl: `${CONFIG.publicUrl}/manage/${booking.manageToken}`,
    calendarUrl: `${CONFIG.publicUrl}/calendar/${booking.manageToken}.ics`,
    googleCalendarUrl: booking.googleEventUrl || googleCalendarUrl(booking),
  };
}

export function guestConfirmationEmail(booking, heading = "You’re booked.") {
  const b = bookingPublic(booking);
  const local = formatDateTime(booking.startMs, booking.timezone || CONFIG.hostTimeZone);
  const host = formatDateTime(booking.startMs, CONFIG.hostTimeZone);
  const room = escapeHtml(b.roomUrl);
  const manage = escapeHtml(b.manageUrl);
  const google = escapeHtml(b.googleCalendarUrl);
  return {
    subject: `Confirmed: Meet with Clinton — ${local}`,
    text: `${heading}\n\n${local}\nHost time: ${host}\n\nTopic: ${booking.topic}\nVideo room: ${b.roomUrl}\nManage booking: ${b.manageUrl}\nAdd to Google Calendar: ${b.googleCalendarUrl}`,
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:620px;margin:auto;background:#10151b;border:1px solid #28323d;border-radius:16px"><tr><td style="padding:32px"><p style="margin:0 0 10px;color:#68e4f6;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Clintware Meet</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">${escapeHtml(heading)}</h1><p style="margin:0 0 6px;color:#f4f7fb;font-size:18px;font-weight:700">${escapeHtml(local)}</p><p style="margin:0 0 20px;color:#8290a1;font-size:13px">Clinton’s time: ${escapeHtml(host)}</p><p style="margin:0 0 24px;color:#c2cbd7;line-height:1.55"><strong>Topic:</strong> ${escapeHtml(booking.topic)}</p><p style="margin:0 0 14px"><a href="${room}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#68e4f6;color:#071115;font-weight:700;text-decoration:none">Open video room</a></p><p style="margin:0;color:#8290a1;font-size:12px;line-height:1.7"><a href="${manage}" style="color:#bdf7ff">Reschedule or cancel</a> · <a href="${google}" style="color:#bdf7ff">Add to Google Calendar</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function hostNotificationEmail(booking, action = "New booking") {
  const b = bookingPublic(booking);
  const host = formatDateTime(booking.startMs, CONFIG.hostTimeZone);
  return {
    subject: `${action}: ${booking.name} @ ${host}`,
    text: `${action}\n\n${booking.name} <${booking.email}>\n${booking.company || ""}\n${host}\nPurpose: ${booking.purpose || ""}\nTopic: ${booking.topic}\nVideo room: ${b.roomUrl}\nManage: ${b.manageUrl}`,
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><div style="max-width:620px;margin:32px auto;padding:28px;background:#10151b;border:1px solid #28323d;border-radius:16px"><div style="color:#68e4f6;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Clintware Meet</div><h1 style="font-size:26px;margin:10px 0 18px">${escapeHtml(action)}</h1><p><strong>${escapeHtml(booking.name)}</strong> · ${escapeHtml(booking.email)}</p><p style="color:#c2cbd7">${escapeHtml(host)}</p><p style="color:#c2cbd7"><strong>Purpose:</strong> ${escapeHtml(booking.purpose || "—")}<br><strong>Topic:</strong> ${escapeHtml(booking.topic)}</p><p><a href="${escapeHtml(b.roomUrl)}" style="color:#bdf7ff">Video room</a> · <a href="${escapeHtml(b.manageUrl)}" style="color:#bdf7ff">Manage</a></p></div></body></html>`,
  };
}

export function reminderEmail(booking, minutes) {
  const b = bookingPublic(booking);
  const local = formatDateTime(booking.startMs, booking.timezone || CONFIG.hostTimeZone);
  const label = minutes >= 60 ? `${Math.round(minutes / 60)} hours` : `${minutes} minutes`;
  return {
    subject: `Reminder: Meet with Clinton starts in ${label}`,
    text: `Your meeting with Clinton starts in ${label}.\n\n${local}\nTopic: ${booking.topic}\nJoin: ${b.roomUrl}\nReschedule or cancel: ${b.manageUrl}`,
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><div style="max-width:600px;margin:32px auto;padding:28px;background:#10151b;border:1px solid #28323d;border-radius:16px"><div style="color:#68e4f6;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Meeting reminder</div><h1 style="font-size:26px;margin:10px 0 16px">Starts in ${escapeHtml(label)}.</h1><p style="color:#c2cbd7">${escapeHtml(local)}</p><p><a href="${escapeHtml(b.roomUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#68e4f6;color:#071115;font-weight:700;text-decoration:none">Join video room</a></p><p style="font-size:12px"><a href="${escapeHtml(b.manageUrl)}" style="color:#bdf7ff">Reschedule or cancel</a></p></div></body></html>`,
  };
}

export function followupEmail(booking) {
  return {
    subject: "Thank you for your time",
    text: "Thank you for meeting with Clinton. If there is feedback, a follow-up, or a deliverable to send, reply to this email and it will go directly to Clinton.",
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><div style="max-width:600px;margin:32px auto;padding:28px;background:#10151b;border:1px solid #28323d;border-radius:16px"><div style="color:#82e7b4;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Thank you</div><h1 style="font-size:26px;margin:10px 0 16px">Thank you for your time.</h1><p style="color:#c2cbd7;line-height:1.6">If there is feedback, a follow-up, or a deliverable to send, reply to this email and it will go directly to Clinton.</p></div></body></html>`,
  };
}
