import { DurableObject } from "cloudflare:workers";
import {
  CONFIG,
  base64Utf8,
  bookingPublic,
  buildIcs,
  cleanText,
  createToken,
  filterAvailableSlots,
  followupEmail,
  generateCandidateSlots,
  guestConfirmationEmail,
  hostDateString,
  hostNotificationEmail,
  isValidEmail,
  json,
  normalizeEmail,
  readJson,
  reminderEmail,
  sha256,
  validateRequestedStart,
} from "./lib.js";
import { bookingPage, managePage, roomPage } from "./ui.js";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  filterSlotsAgainstGoogleBusy,
  googleBusyIntervals,
  googleCalendarConfigured,
  getGoogleCalendarEvent,
  requestedTimeIsGoogleBusy,
  updateGoogleCalendarEvent,
} from "./google-calendar.js";

function securityHeaders(extra = {}) {
  return {
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...extra,
  };
}

function acquisitionMeta(request) {
  const url = new URL(request.url);
  let referrerDomain = "direct";
  try {
    const ref = request.headers.get("referer");
    if (ref) referrerDomain = new URL(ref).hostname || "direct";
  } catch {}
  const clip = (value, max = 120) => cleanText(value || "", max);
  return {
    event: "meet_page_view",
    path: url.pathname,
    referrerDomain,
    utmSource: clip(url.searchParams.get("utm_source"), 100),
    utmMedium: clip(url.searchParams.get("utm_medium"), 100),
    utmCampaign: clip(url.searchParams.get("utm_campaign"), 120),
    utmContent: clip(url.searchParams.get("utm_content"), 120),
    country: clip(request.cf?.country, 8),
    region: clip(request.cf?.region, 80),
    colo: clip(request.cf?.colo, 16),
  };
}

function html(content) {
  return new Response(content, {
    headers: securityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com; img-src 'self' data: https://www.google-analytics.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com; frame-src https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com; font-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self';",
    }),
  });
}

function store(env) {
  return env.SCHEDULER.getByName("clintware-meet-v1");
}

function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    manageToken: row.manage_token,
    manageHash: row.manage_hash,
    name: row.name,
    email: row.email,
    company: row.company || "",
    purpose: row.purpose || "",
    topic: row.topic || "",
    startMs: Number(row.start_ms),
    endMs: Number(row.end_ms),
    hostDate: row.host_date,
    timezone: row.timezone || CONFIG.hostTimeZone,
    status: row.status,
    roomCode: row.room_code,
    googleEventId: row.google_event_id || "",
    sequence: Number(row.sequence || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

async function mail(env, payload) {
  if (!env.MAILER || !env.INTERNAL_MAIL_SECRET) throw new Error("mailer_not_configured");
  const response = await env.MAILER.fetch("https://clintware-mailer/internal/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-clintware-mail-secret": env.INTERNAL_MAIL_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`mail_failed:${response.status}:${body.slice(0, 160)}`);
  }
}

function attachmentFor(booking, method = "REQUEST") {
  return [{
    filename: "meeting.ics",
    content: base64Utf8(buildIcs(booking, method)),
    content_type: "text/calendar; charset=utf-8; method=" + method,
  }];
}

async function sendBookingMail(env, booking, kind = "confirmed", includeIcs = true) {
  const guest = guestConfirmationEmail(booking, kind === "rescheduled" ? "Your meeting was rescheduled." : "You’re booked.");
  const host = hostNotificationEmail(booking, kind === "rescheduled" ? "Booking rescheduled" : "New booking");
  const suffix = `${booking.id}-${booking.sequence}-${kind}`;
  const attachments = includeIcs ? attachmentFor(booking) : [];

  if (booking.email === CONFIG.hostEmail) {
    const result = await Promise.allSettled([
      mail(env, {
        to: [booking.email],
        reply_to: CONFIG.hostEmail,
        ...guest,
        attachments,
        category: "scheduler_confirmation",
        idempotency_key: `meet-guest-${suffix}`,
      }),
    ]);
    return { guest: result[0].status === "fulfilled", host: result[0].status === "fulfilled" };
  }

  const results = await Promise.allSettled([
    mail(env, {
      to: [booking.email],
      reply_to: CONFIG.hostEmail,
      ...guest,
      attachments,
      category: "scheduler_confirmation",
      idempotency_key: `meet-guest-${suffix}`,
    }),
    mail(env, {
      to: [CONFIG.hostEmail],
      reply_to: booking.email,
      ...host,
      attachments,
      category: "scheduler_host",
      idempotency_key: `meet-host-${suffix}`,
    }),
  ]);
  return { guest: results[0].status === "fulfilled", host: results[1].status === "fulfilled" };
}

async function sendCancellationMail(env, booking, includeIcs = true) {
  const attachments = includeIcs ? attachmentFor(booking, "CANCEL") : [];
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.timezone || CONFIG.hostTimeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(booking.startMs));
  const guest = {
    subject: `Canceled: Meet with Clinton — ${local}`,
    text: `Your meeting with Clinton on ${local} was canceled. You can book another time at ${CONFIG.publicUrl}.`,
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><div style="max-width:600px;margin:32px auto;padding:28px;background:#10151b;border:1px solid #28323d;border-radius:16px"><div style="color:#ffb1b1;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Canceled</div><h1 style="font-size:26px;margin:10px 0 16px">Meeting canceled.</h1><p style="color:#c2cbd7">${local}</p><p><a href="${CONFIG.publicUrl}" style="color:#bdf7ff">Book another time</a></p></div></body></html>`,
  };
  const host = hostNotificationEmail(booking, "Booking canceled");
  const suffix = `${booking.id}-${booking.sequence}-cancel`;

  if (booking.email === CONFIG.hostEmail) {
    return Promise.allSettled([
      mail(env, {
        to: [booking.email],
        reply_to: CONFIG.hostEmail,
        ...guest,
        attachments,
        category: "scheduler_cancel",
        idempotency_key: `meet-guest-${suffix}`,
      }),
    ]);
  }

  return Promise.allSettled([
    mail(env, {
      to: [booking.email],
      reply_to: CONFIG.hostEmail,
      ...guest,
      attachments,
      category: "scheduler_cancel",
      idempotency_key: `meet-guest-${suffix}`,
    }),
    mail(env, {
      to: [CONFIG.hostEmail],
      reply_to: booking.email,
      ...host,
      attachments,
      category: "scheduler_cancel_host",
      idempotency_key: `meet-host-${suffix}`,
    }),
  ]);
}

async function lookupBooking(env, token) {
  const hash = await sha256(token);
  const response = await store(env).fetch(`https://scheduler/lookup?hash=${encodeURIComponent(hash)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.booking || null;
}

function publicBookingWithToken(booking) {
  return bookingPublic({ ...booking, manageToken: booking.manageToken });
}

function normalizeBookingInput(input) {
  const name = cleanText(input.name, 100);
  const email = normalizeEmail(input.email);
  const company = cleanText(input.company, 120);
  const purpose = cleanText(input.purpose, 100);
  const topic = cleanText(input.topic, 1200);
  const timezone = cleanText(input.timezone, 100) || CONFIG.hostTimeZone;
  const startMs = Number(input.startMs);
  if (!name || !isValidEmail(email) || !purpose || !topic || !Number.isFinite(startMs)) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    return null;
  }
  return { name, email, company, purpose, topic, timezone, startMs };
}

export class SchedulerState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY NOT NULL,
        manage_token TEXT NOT NULL,
        manage_hash TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        purpose TEXT NOT NULL DEFAULT '',
        topic TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        host_date TEXT NOT NULL,
        timezone TEXT NOT NULL,
        status TEXT NOT NULL,
        room_code TEXT NOT NULL,
        google_event_id TEXT,
        sequence INTEGER NOT NULL DEFAULT 0,
        reminder_120_sent INTEGER NOT NULL DEFAULT 0,
        reminder_5_sent INTEGER NOT NULL DEFAULT 0,
        followup_sent INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        canceled_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(status, start_ms, end_ms);
      CREATE INDEX IF NOT EXISTS idx_bookings_hash ON bookings(manage_hash);
    `);
    try {
      this.sql.exec("ALTER TABLE bookings ADD COLUMN google_event_id TEXT");
    } catch {}
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      const row = this.sql.exec("SELECT COUNT(*) AS count FROM bookings WHERE status = 'confirmed' AND end_ms > ?", Date.now()).toArray()[0];
      return json({ ok: true, futureBookings: Number(row?.count || 0) });
    }
    if (request.method === "GET" && url.pathname === "/availability") return this.availability();
    if (request.method === "GET" && url.pathname === "/lookup") return this.lookup(url.searchParams.get("hash") || "");
    if (request.method === "POST" && url.pathname === "/reserve") return this.reserve(await request.json());
    if (request.method === "POST" && url.pathname === "/google-event") return this.setGoogleEvent(await request.json());
    if (request.method === "POST" && url.pathname === "/reschedule") return this.reschedule(await request.json());
    if (request.method === "POST" && url.pathname === "/cancel") return this.cancel(await request.json());
    if (request.method === "POST" && url.pathname === "/self-test") return this.selfTest();
    if (request.method === "POST" && url.pathname === "/cleanup-deployment-tests") return this.cleanupDeploymentTests();
    return json({ error: "not_found" }, 404);
  }

  busyRows(fromMs, toMs) {
    return this.sql.exec(
      "SELECT id,start_ms,end_ms,host_date,status FROM bookings WHERE status = 'confirmed' AND start_ms < ? AND end_ms > ? ORDER BY start_ms",
      toMs,
      fromMs,
    ).toArray().map((row) => ({
      id: row.id,
      startMs: Number(row.start_ms),
      endMs: Number(row.end_ms),
      hostDate: row.host_date,
      status: row.status,
    }));
  }

  async availability() {
    const now = Date.now();
    const candidates = generateCandidateSlots(now, CONFIG);
    const from = candidates[0]?.startMs || now;
    const to = candidates.at(-1)?.endMs || now;
    const busy = this.busyRows(from - 86_400_000, to + 86_400_000);
    const slots = filterAvailableSlots(candidates, busy, CONFIG)
      .slice(0, 320)
      .map((slot) => ({ startMs: slot.startMs, endMs: slot.endMs }));
    return json({
      slots,
      config: {
        durationMinutes: CONFIG.durationMinutes,
        hostTimeZone: CONFIG.hostTimeZone,
        minNoticeMinutes: CONFIG.minNoticeMinutes,
        bufferBeforeMinutes: CONFIG.bufferBeforeMinutes,
        bufferAfterMinutes: CONFIG.bufferAfterMinutes,
      },
    });
  }

  async lookup(hash) {
    const row = this.sql.exec("SELECT * FROM bookings WHERE manage_hash = ? LIMIT 1", hash).toArray()[0];
    return row ? json({ booking: rowToBooking(row) }) : json({ error: "booking_not_found" }, 404);
  }

  hasConflict(startMs, endMs, excludeId = "") {
    const before = CONFIG.bufferBeforeMinutes * 60_000;
    const after = CONFIG.bufferAfterMinutes * 60_000;
    const rows = excludeId
      ? this.sql.exec(
          "SELECT id FROM bookings WHERE status='confirmed' AND id != ? AND start_ms < ? AND end_ms > ? LIMIT 1",
          excludeId,
          endMs + after,
          startMs - before,
        ).toArray()
      : this.sql.exec(
          "SELECT id FROM bookings WHERE status='confirmed' AND start_ms < ? AND end_ms > ? LIMIT 1",
          endMs + after,
          startMs - before,
        ).toArray();
    return rows.length > 0;
  }

  dayAtLimit(hostDate, excludeId = "") {
    const row = excludeId
      ? this.sql.exec(
          "SELECT COUNT(*) AS count FROM bookings WHERE status='confirmed' AND host_date=? AND id != ?",
          hostDate,
          excludeId,
        ).toArray()[0]
      : this.sql.exec(
          "SELECT COUNT(*) AS count FROM bookings WHERE status='confirmed' AND host_date=?",
          hostDate,
        ).toArray()[0];
    return Number(row?.count || 0) >= CONFIG.maxBookingsPerDay;
  }

  async reserve(input) {
    const now = Date.now();
    const startMs = Number(input.startMs);
    if (!validateRequestedStart(startMs, now, CONFIG)) return json({ error: "slot_not_available" }, 409);
    const endMs = startMs + CONFIG.durationMinutes * 60_000;
    const hostDate = hostDateString(startMs, CONFIG.hostTimeZone);
    if (this.hasConflict(startMs, endMs) || this.dayAtLimit(hostDate)) {
      return json({ error: "slot_not_available" }, 409);
    }

    const booking = {
      id: input.id,
      manageToken: input.manageToken,
      manageHash: input.manageHash,
      name: input.name,
      email: input.email,
      company: input.company || "",
      purpose: input.purpose || "",
      topic: input.topic,
      startMs,
      endMs,
      hostDate,
      timezone: input.timezone || CONFIG.hostTimeZone,
      status: "confirmed",
      roomCode: input.roomCode,
      sequence: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.sql.exec(
        `INSERT INTO bookings (id,manage_token,manage_hash,name,email,company,purpose,topic,start_ms,end_ms,host_date,timezone,status,room_code,sequence,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        booking.id,
        booking.manageToken,
        booking.manageHash,
        booking.name,
        booking.email,
        booking.company,
        booking.purpose,
        booking.topic,
        booking.startMs,
        booking.endMs,
        booking.hostDate,
        booking.timezone,
        booking.status,
        booking.roomCode,
        booking.sequence,
        now,
        now,
      );
    } catch (error) {
      console.error(JSON.stringify({ event: "reserve_insert_failed", message: String(error) }));
      return json({ error: "slot_not_available" }, 409);
    }

    await this.scheduleNextAlarm();
    return json({ booking }, 201);
  }

  async setGoogleEvent(input) {
    const id = cleanText(input.id, 80);
    const googleEventId = cleanText(input.googleEventId, 1024);
    if (!id || !googleEventId) return json({ error: "invalid_google_event" }, 422);
    this.sql.exec("UPDATE bookings SET google_event_id=?,updated_at=? WHERE id=?", googleEventId, Date.now(), id);
    const row = this.sql.exec("SELECT * FROM bookings WHERE id=? LIMIT 1", id).toArray()[0];
    return row ? json({ booking: rowToBooking(row) }) : json({ error: "booking_not_found" }, 404);
  }

  async reschedule(input) {
    const row = this.sql.exec("SELECT * FROM bookings WHERE manage_hash=? LIMIT 1", input.manageHash).toArray()[0];
    if (!row) return json({ error: "booking_not_found" }, 404);
    if (row.status !== "confirmed") return json({ error: "booking_not_active" }, 409);

    const now = Date.now();
    const startMs = Number(input.startMs);
    if (!validateRequestedStart(startMs, now, CONFIG)) return json({ error: "slot_not_available" }, 409);
    const endMs = startMs + CONFIG.durationMinutes * 60_000;
    const hostDate = hostDateString(startMs, CONFIG.hostTimeZone);
    if (this.hasConflict(startMs, endMs, row.id) || this.dayAtLimit(hostDate, row.id)) {
      return json({ error: "slot_not_available" }, 409);
    }

    const timezone = input.timezone || row.timezone || CONFIG.hostTimeZone;
    const updated = Date.now();
    this.sql.exec(
      `UPDATE bookings SET start_ms=?,end_ms=?,host_date=?,timezone=?,sequence=sequence+1,reminder_120_sent=0,reminder_5_sent=0,followup_sent=0,updated_at=? WHERE id=?`,
      startMs,
      endMs,
      hostDate,
      timezone,
      updated,
      row.id,
    );
    await this.scheduleNextAlarm();
    return this.lookup(input.manageHash);
  }

  async cancel(input) {
    const row = this.sql.exec("SELECT * FROM bookings WHERE manage_hash=? LIMIT 1", input.manageHash).toArray()[0];
    if (!row) return json({ error: "booking_not_found" }, 404);
    if (row.status === "canceled") return json({ booking: rowToBooking(row) });

    const now = Date.now();
    this.sql.exec(
      "UPDATE bookings SET status='canceled',sequence=sequence+1,updated_at=?,canceled_at=? WHERE id=?",
      now,
      now,
      row.id,
    );
    await this.scheduleNextAlarm();
    return this.lookup(input.manageHash);
  }

  async cleanupDeploymentTests() {
    const rows = this.sql.exec(
      "SELECT id FROM bookings WHERE name=? AND email=? AND topic=? AND status='confirmed'",
      "ClintCal Deployment Test",
      CONFIG.hostEmail,
      "Automated production booking verification",
    ).toArray();
    const now = Date.now();
    for (const row of rows) {
      this.sql.exec(
        "UPDATE bookings SET status='canceled',sequence=sequence+1,updated_at=?,canceled_at=? WHERE id=?",
        now,
        now,
        row.id,
      );
    }
    await this.scheduleNextAlarm();
    return json({ ok: true, canceled: rows.length });
  }

  async selfTest() {
    const id = `selftest-${crypto.randomUUID()}`;
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO bookings (id,manage_token,manage_hash,name,email,company,purpose,topic,start_ms,end_ms,host_date,timezone,status,room_code,sequence,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      id,
      id,
      "Self Test",
      "selftest@example.invalid",
      "",
      "self-test",
      "self-test",
      now - 60_000,
      now - 30_000,
      hostDateString(now, CONFIG.hostTimeZone),
      CONFIG.hostTimeZone,
      "test",
      id,
      0,
      now,
      now,
    );
    const exists = Number(
      this.sql.exec("SELECT COUNT(*) AS count FROM bookings WHERE id=?", id).toArray()[0]?.count || 0,
    ) === 1;
    this.sql.exec("DELETE FROM bookings WHERE id=?", id);
    return json({ ok: exists, storage: exists ? "sqlite" : "failed" });
  }

  async scheduleNextAlarm() {
    const now = Date.now();
    const rows = this.sql.exec(
      "SELECT start_ms,end_ms,reminder_120_sent,reminder_5_sent,followup_sent FROM bookings WHERE status='confirmed' AND end_ms > ? ORDER BY start_ms LIMIT 300",
      now - 24 * 60 * 60_000,
    ).toArray();

    let next = null;
    for (const row of rows) {
      const candidates = [];
      if (!Number(row.reminder_120_sent)) candidates.push(Number(row.start_ms) - 120 * 60_000);
      if (!Number(row.reminder_5_sent)) candidates.push(Number(row.start_ms) - 5 * 60_000);
      if (!Number(row.followup_sent)) candidates.push(Number(row.end_ms) + CONFIG.followupDelayMinutes * 60_000);
      for (const due of candidates) {
        const t = due <= now ? now + 1000 : due;
        if (next === null || t < next) next = t;
      }
    }
    if (next !== null) await this.ctx.storage.setAlarm(next);
  }

  async sendScheduled(booking, type) {
    let message;
    let category;
    let key;
    if (type === "reminder120") {
      message = reminderEmail(booking, 120);
      category = "scheduler_reminder_2h";
      key = `meet-r120-${booking.id}-${booking.sequence}`;
    } else if (type === "reminder5") {
      message = reminderEmail(booking, 5);
      category = "scheduler_reminder_5m";
      key = `meet-r5-${booking.id}-${booking.sequence}`;
    } else {
      message = followupEmail(booking);
      category = "scheduler_followup";
      key = `meet-followup-${booking.id}-${booking.sequence}`;
    }

    await mail(this.env, {
      to: [booking.email],
      reply_to: CONFIG.hostEmail,
      ...message,
      category,
      idempotency_key: key,
    });
  }

  async alarm() {
    const now = Date.now();
    const rows = this.sql.exec(
      "SELECT * FROM bookings WHERE status='confirmed' AND end_ms > ? ORDER BY start_ms LIMIT 200",
      now - 24 * 60 * 60_000,
    ).toArray();

    for (const row of rows) {
      const booking = rowToBooking(row);

      if (
        !Number(row.reminder_120_sent) &&
        now >= booking.startMs - 120 * 60_000 &&
        now < booking.startMs
      ) {
        await this.sendScheduled(booking, "reminder120");
        this.sql.exec("UPDATE bookings SET reminder_120_sent=1 WHERE id=?", booking.id);
      }

      if (
        !Number(row.reminder_5_sent) &&
        now >= booking.startMs - 5 * 60_000 &&
        now < booking.startMs + 2 * 60_000
      ) {
        await this.sendScheduled(booking, "reminder5");
        this.sql.exec("UPDATE bookings SET reminder_5_sent=1 WHERE id=?", booking.id);
      }

      if (
        !Number(row.followup_sent) &&
        now >= booking.endMs + CONFIG.followupDelayMinutes * 60_000
      ) {
        await this.sendScheduled(booking, "followup");
        this.sql.exec("UPDATE bookings SET followup_sent=1 WHERE id=?", booking.id);
      }
    }

    await this.scheduleNextAlarm();
  }
}

async function apiAvailability(env) {
  const response = await store(env).fetch("https://scheduler/availability");
  const data = await response.json();
  if (!response.ok) return json(data, response.status, { "Cache-Control": "no-store" });

  let calendarSync = googleCalendarConfigured(env) ? "degraded" : "not_configured";
  if (googleCalendarConfigured(env) && Array.isArray(data.slots) && data.slots.length) {
    try {
      const before = CONFIG.bufferBeforeMinutes * 60_000;
      const after = CONFIG.bufferAfterMinutes * 60_000;
      const fromMs = data.slots[0].startMs - before;
      const toMs = data.slots.at(-1).endMs + after;
      const busy = await googleBusyIntervals(env, fromMs, toMs);
      data.slots = filterSlotsAgainstGoogleBusy(data.slots, busy, CONFIG);
      calendarSync = "google";
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_availability_failed",
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  return json({ ...data, calendarSync }, response.status, { "Cache-Control": "no-store" });
}

async function apiBook(request, env) {
  const input = normalizeBookingInput(await readJson(request));
  if (!input) {
    return json({
      error: "Enter a valid name, email, purpose, topic, timezone, and available time.",
    }, 422);
  }

  if (googleCalendarConfigured(env)) {
    try {
      const endMs = input.startMs + CONFIG.durationMinutes * 60_000;
      const before = CONFIG.bufferBeforeMinutes * 60_000;
      const after = CONFIG.bufferAfterMinutes * 60_000;
      const busy = await googleBusyIntervals(env, input.startMs - before, endMs + after);
      if (requestedTimeIsGoogleBusy(input.startMs, endMs, busy, CONFIG)) {
        return json({ error: "slot_not_available" }, 409);
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_prebook_check_failed",
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  const manageToken = createToken(24);
  const manageHash = await sha256(manageToken);
  const payload = {
    ...input,
    id: crypto.randomUUID(),
    roomCode: createToken(12),
    manageToken,
    manageHash,
  };

  const reserved = await store(env).fetch("https://scheduler/reserve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await reserved.json();
  if (!reserved.ok) return json(data, reserved.status);

  const booking = data.booking;
  let calendar = {
    configured: googleCalendarConfigured(env),
    synced: false,
    inviteSent: false,
    meetLink: "",
    eventUrl: "",
  };

  if (calendar.configured) {
    try {
      const event = await createGoogleCalendarEvent(env, booking);
      booking.googleEventId = event.id;
      const linked = await store(env).fetch("https://scheduler/google-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: booking.id, googleEventId: event.id }),
      });
      if (!linked.ok) throw new Error("google_event_link_failed");
      calendar = {
        configured: true,
        synced: true,
        inviteSent: true,
        meetLink: event.hangoutLink || "",
        eventUrl: event.htmlLink || "",
      };
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_event_create_failed",
        bookingId: booking.id,
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  let delivery = { guest: false, host: false };
  try {
    delivery = await sendBookingMail(env, booking, "confirmed", !calendar.synced);
  } catch (error) {
    console.error(JSON.stringify({
      event: "booking_mail_failed",
      bookingId: booking.id,
      message: String(error),
    }));
  }

  return json({ booking: publicBookingWithToken(booking), delivery, calendar }, 201);
}

async function apiManage(env, token) {
  const booking = await lookupBooking(env, token);
  if (!booking) return json({ error: "booking_not_found" }, 404);

  let calendar = {
    configured: googleCalendarConfigured(env),
    synced: false,
    inviteSent: false,
    meetLink: "",
    eventUrl: "",
  };

  if (calendar.configured && booking.googleEventId) {
    try {
      const event = await getGoogleCalendarEvent(env, booking);
      calendar = {
        configured: true,
        synced: Boolean(event),
        inviteSent: true,
        meetLink: event?.hangoutLink || "",
        eventUrl: event?.htmlLink || "",
      };
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_event_read_failed",
        bookingId: booking.id,
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  return json({
    booking: publicBookingWithToken({ ...booking, manageToken: token }),
    calendar,
  });
}

async function apiReschedule(request, env, token) {
  const existing = await lookupBooking(env, token);
  if (!existing) return json({ error: "booking_not_found" }, 404);

  const body = await readJson(request);
  const startMs = Number(body.startMs);
  const timezone = cleanText(body.timezone, 100) || existing.timezone || CONFIG.hostTimeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    return json({ error: "invalid_timezone" }, 422);
  }

  if (googleCalendarConfigured(env) && startMs !== existing.startMs) {
    try {
      const endMs = startMs + CONFIG.durationMinutes * 60_000;
      const before = CONFIG.bufferBeforeMinutes * 60_000;
      const after = CONFIG.bufferAfterMinutes * 60_000;
      const busy = await googleBusyIntervals(env, startMs - before, endMs + after);
      if (requestedTimeIsGoogleBusy(startMs, endMs, busy, CONFIG)) {
        return json({ error: "slot_not_available" }, 409);
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_prereschedule_check_failed",
        bookingId: existing.id,
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  const manageHash = await sha256(token);
  const response = await store(env).fetch("https://scheduler/reschedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manageHash, startMs, timezone }),
  });
  const data = await response.json();
  if (!response.ok) return json(data, response.status);

  const booking = { ...data.booking, manageToken: token };
  let calendar = {
    configured: googleCalendarConfigured(env),
    synced: false,
    inviteSent: false,
    meetLink: "",
    eventUrl: "",
  };

  if (calendar.configured) {
    try {
      let event;
      if (booking.googleEventId) {
        event = await updateGoogleCalendarEvent(env, booking);
      } else {
        event = await createGoogleCalendarEvent(env, booking);
        booking.googleEventId = event.id;
        const linked = await store(env).fetch("https://scheduler/google-event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: booking.id, googleEventId: event.id }),
        });
        if (!linked.ok) throw new Error("google_event_link_failed");
      }
      calendar = {
        configured: true,
        synced: true,
        inviteSent: true,
        meetLink: event?.hangoutLink || "",
        eventUrl: event?.htmlLink || "",
      };
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_event_update_failed",
        bookingId: booking.id,
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  try {
    await sendBookingMail(env, booking, "rescheduled", !calendar.synced);
  } catch (error) {
    console.error(JSON.stringify({
      event: "reschedule_mail_failed",
      bookingId: booking.id,
      message: String(error),
    }));
  }

  return json({ booking: publicBookingWithToken(booking), calendar });
}

async function apiCancel(env, token) {
  const existing = await lookupBooking(env, token);
  if (!existing) return json({ error: "booking_not_found" }, 404);

  let calendar = {
    configured: googleCalendarConfigured(env),
    synced: false,
    inviteSent: false,
    meetLink: "",
    eventUrl: "",
  };
  if (calendar.configured && existing.googleEventId) {
    try {
      await deleteGoogleCalendarEvent(env, { ...existing, manageToken: token });
      calendar = { configured: true, synced: true, inviteSent: true };
    } catch (error) {
      console.error(JSON.stringify({
        event: "google_calendar_event_delete_failed",
        bookingId: existing.id,
        message: String(error),
        code: error.code || "calendar_error",
      }));
    }
  }

  const manageHash = await sha256(token);
  const response = await store(env).fetch("https://scheduler/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manageHash }),
  });
  const data = await response.json();
  if (!response.ok) return json(data, response.status);

  const booking = { ...data.booking, manageToken: token };
  try {
    await sendCancellationMail(env, booking, !calendar.synced);
  } catch (error) {
    console.error(JSON.stringify({
      event: "cancel_mail_failed",
      bookingId: booking.id,
      message: String(error),
    }));
  }

  return json({ booking: publicBookingWithToken(booking), calendar });
}

async function health(env) {
  const [storageResponse, mailResponse] = await Promise.allSettled([
    store(env).fetch("https://scheduler/health"),
    env.MAILER
      ? env.MAILER.fetch("https://mailer/health")
      : Promise.reject(new Error("mailer_binding_missing")),
  ]);

  let storage = { ok: false };
  let mailer = { ok: false };

  if (storageResponse.status === "fulfilled") {
    storage = await storageResponse.value.json().catch(() => ({ ok: false }));
  }
  if (mailResponse.status === "fulfilled") {
    mailer = await mailResponse.value.json().catch(() => ({ ok: false }));
  }

  const ok = Boolean(storage.ok && mailer.deliveryConfigured && env.INTERNAL_MAIL_SECRET);
  return json({
    ok,
    app: "clintware-meet",
    mode: "clintcal-native",
    storage: storage.ok ? "sqlite" : "error",
    mailer: mailer.deliveryConfigured ? (mailer.provider || "configured") : "error",
    durationMinutes: CONFIG.durationMinutes,
  }, ok ? 200 : 503, { "Cache-Control": "no-store" });
}

async function adminCleanupDeploymentTests(request, env) {
  const supplied = request.headers.get("x-clintware-admin-secret") || "";
  if (!env.SCHEDULER_ADMIN_SECRET || supplied !== env.SCHEDULER_ADMIN_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  const response = await store(env).fetch("https://scheduler/cleanup-deployment-tests", { method: "POST" });
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function adminSelfTest(request, env) {
  const supplied = request.headers.get("x-clintware-admin-secret") || "";
  if (!env.SCHEDULER_ADMIN_SECRET || supplied !== env.SCHEDULER_ADMIN_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const storageResponse = await store(env).fetch("https://scheduler/self-test", { method: "POST" });
  const storage = await storageResponse.json();

  const availabilityResponse = await store(env).fetch("https://scheduler/availability");
  const availability = await availabilityResponse.json();

  const mailResponse = env.MAILER ? await env.MAILER.fetch("https://mailer/health") : null;
  const mailer = mailResponse ? await mailResponse.json().catch(() => ({})) : {};

  const ok = Boolean(
    storage.ok &&
    Array.isArray(availability.slots) &&
    availability.slots.length > 0
  );

  return json({
    ok,
    storage,
    slots: availability.slots?.length || 0,
    mailer: Boolean(mailer.deliveryConfigured),
    mailerRequiredForCoreBooking: false,
    calendarBridgeConfigured: googleCalendarConfigured(env),
    bookingFlow: "reserve/reschedule/cancel protected by durable-object serialization",
  }, ok ? 200 : 503);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") return health(env);
      if (request.method === "POST" && url.pathname === "/api/admin/self-test") {
        return adminSelfTest(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/admin/cleanup-deployment-tests") {
        return adminCleanupDeploymentTests(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/availability") {
        return apiAvailability(env);
      }
      if (request.method === "POST" && url.pathname === "/api/book") {
        return apiBook(request, env);
      }

      const manageApi = url.pathname.match(/^\/api\/manage\/([a-f0-9]{48})$/);
      if (request.method === "GET" && manageApi) return apiManage(env, manageApi[1]);

      const rescheduleApi = url.pathname.match(/^\/api\/manage\/([a-f0-9]{48})\/reschedule$/);
      if (request.method === "POST" && rescheduleApi) {
        return apiReschedule(request, env, rescheduleApi[1]);
      }

      const cancelApi = url.pathname.match(/^\/api\/manage\/([a-f0-9]{48})\/cancel$/);
      if (request.method === "POST" && cancelApi) return apiCancel(env, cancelApi[1]);

      const calendar = url.pathname.match(/^\/calendar\/([a-f0-9]{48})\.ics$/);
      if (request.method === "GET" && calendar) {
        const booking = await lookupBooking(env, calendar[1]);
        if (!booking) return new Response("Not found", { status: 404 });
        const withToken = { ...booking, manageToken: calendar[1] };
        return new Response(
          buildIcs(withToken, booking.status === "canceled" ? "CANCEL" : "REQUEST"),
          {
            headers: securityHeaders({
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": "attachment; filename=meeting.ics",
              "Cache-Control": "no-store",
            }),
          },
        );
      }

      const manage = url.pathname.match(/^\/manage\/([a-f0-9]{48})\/?$/);
      if (request.method === "GET" && manage) return html(managePage(manage[1]));

      const room = url.pathname.match(/^\/room\/([a-f0-9]{24})\/?$/);
      if (request.method === "GET" && room) return html(roomPage(room[1]));

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        console.log(JSON.stringify(acquisitionMeta(request)));
        return html(bookingPage());
      }

      return new Response("Not found", { status: 404, headers: securityHeaders() });
    } catch (error) {
      console.error(JSON.stringify({
        event: "meet_error",
        path: url.pathname,
        code: error.code || "internal_error",
        message: String(error),
      }));
      const status = error.code === "payload_too_large"
        ? 413
        : error.code === "invalid_json"
          ? 400
          : 500;
      return json({
        error: status === 500 ? "The request could not be completed." : error.code,
      }, status);
    }
  },
};
