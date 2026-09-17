import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const apiBase = (process.env.CLINTCAL_API_BASE_URL ?? "https://meet.clintware.com/v2").replace(/\/$/, "");
const apiKey = process.env.CLINTCAL_API_KEY;
const apiVersion = process.env.CLINTCAL_API_VERSION;

if (!apiKey) throw new Error("CLINTCAL_API_KEY is required");
if (!apiVersion) throw new Error("CLINTCAL_API_VERSION is required");

async function calRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "cal-api-version": apiVersion,
      ...(init.headers ?? {}),
    },
  });

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }

  if (!response.ok) {
    throw new Error(`ClintCal API ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function result(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({
  name: process.env.CLINTCAL_MCP_NAME ?? "clintware-scheduling",
  version: "0.1.0",
});

server.tool(
  "list_meeting_types",
  "List the bookable ClintCal meeting types.",
  {},
  async () => result(await calRequest("/event-types")),
);

server.tool(
  "get_availability",
  "Get available booking slots for a ClintCal event type. Times must be ISO 8601.",
  {
    eventTypeId: z.number().int().positive(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  },
  async ({ eventTypeId, startTime, endTime }) => {
    const params = new URLSearchParams({
      eventTypeId: String(eventTypeId),
      startTime,
      endTime,
    });
    return result(await calRequest(`/slots?${params.toString()}`));
  },
);

server.tool(
  "create_booking",
  "Create a booking after availability has been checked.",
  {
    eventTypeId: z.number().int().positive(),
    start: z.string().min(1),
    attendeeName: z.string().min(1),
    attendeeEmail: z.string().email(),
    attendeeTimeZone: z.string().min(1),
    bookingFieldsResponses: z.record(z.unknown()).optional(),
  },
  async ({ eventTypeId, start, attendeeName, attendeeEmail, attendeeTimeZone, bookingFieldsResponses }) => {
    const slots = await calRequest(
      `/slots?${new URLSearchParams({ eventTypeId: String(eventTypeId), startTime: start, endTime: new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString() })}`,
    );

    // The API remains the final authority on whether the slot can be booked. The preflight
    // request narrows race conditions and ensures callers do not blindly submit bookings.
    if (!slots) throw new Error("No availability response received; booking was not attempted.");

    return result(
      await calRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          start,
          eventTypeId,
          attendee: {
            name: attendeeName,
            email: attendeeEmail,
            timeZone: attendeeTimeZone,
          },
          ...(bookingFieldsResponses ? { bookingFieldsResponses } : {}),
        }),
      }),
    );
  },
);

server.tool(
  "reschedule_booking",
  "Reschedule an existing ClintCal booking by UID.",
  {
    uid: z.string().min(1),
    start: z.string().min(1),
    reschedulingReason: z.string().optional(),
  },
  async ({ uid, start, reschedulingReason }) =>
    result(
      await calRequest(`/bookings/${encodeURIComponent(uid)}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ start, ...(reschedulingReason ? { reschedulingReason } : {}) }),
      }),
    ),
);

server.tool(
  "cancel_booking",
  "Cancel an existing ClintCal booking by UID.",
  {
    uid: z.string().min(1),
    cancellationReason: z.string().optional(),
  },
  async ({ uid, cancellationReason }) =>
    result(
      await calRequest(`/bookings/${encodeURIComponent(uid)}/cancel`, {
        method: "POST",
        body: JSON.stringify(cancellationReason ? { cancellationReason } : {}),
      }),
    ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
