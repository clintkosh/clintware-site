import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG,
  generateCandidateSlots,
  filterAvailableSlots,
  overlaps,
  zonedLocalToUtc,
  hostDateString,
} from "../src/lib.js";

test("zoned conversion handles Central time DST", () => {
  const ms = zonedLocalToUtc("2026-09-21", "09:00", "America/Chicago");
  assert.equal(new Date(ms).toISOString(), "2026-09-21T14:00:00.000Z");
});

test("candidate slots are weekdays, 30 minutes, and inside working hours", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  const slots = generateCandidateSlots(now, CONFIG);
  assert.ok(slots.length > 20);
  assert.equal(slots[0].endMs - slots[0].startMs, 30 * 60_000);
  assert.ok(CONFIG.workingWeekdays.includes(new Date(`${slots[0].hostDate}T12:00:00Z`).getUTCDay()));
});

test("confirmed booking blocks overlapping slots with buffers", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  const candidates = generateCandidateSlots(now, CONFIG);
  const target = candidates[3];
  const busy = [{
    startMs: target.startMs,
    endMs: target.endMs,
    hostDate: target.hostDate,
    status: "confirmed",
  }];
  const available = filterAvailableSlots(candidates, busy, CONFIG);
  assert.ok(!available.some((slot) => slot.startMs === target.startMs));
});

test("overlap test excludes separated events", () => {
  assert.equal(overlaps(0, 30, 30, 60, 0, 0), false);
  assert.equal(overlaps(0, 30, 29, 60, 0, 0), true);
});

test("host date is stable", () => {
  assert.equal(hostDateString(Date.parse("2026-09-21T14:00:00Z")), "2026-09-21");
});
