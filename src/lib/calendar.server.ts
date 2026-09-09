/**
 * Google Calendar access for the site owner's own calendar, through the
 * Lovable connector gateway.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

// Kuwait has no daylight saving time, so a fixed offset is safe.
export const KUWAIT_OFFSET = "+03:00";
export const CALENDAR_ID = "primary";

export function isCalendarConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_CALENDAR_API_KEY"]);
}

async function gateway<T>(path: string, init?: RequestInit): Promise<T> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Calendar request failed [${response.status}]: ${body}`);
    throw new Error(`Calendar request failed [${response.status}]: ${body}`);
  }

  return (await response.json()) as T;
}

export type BusyInterval = { start: string; end: string };

export async function getBusyIntervals(timeMin: string, timeMax: string): Promise<BusyInterval[]> {
  const data = await gateway<{
    calendars?: Record<string, { busy?: BusyInterval[] }>;
  }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: "Asia/Kuwait",
      items: [{ id: CALENDAR_ID }],
    }),
  });

  const calendars = data.calendars ?? {};
  return Object.values(calendars).flatMap((entry) => entry.busy ?? []);
}

export async function createCalendarEvent(input: {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendeeEmail: string;
}): Promise<string | null> {
  const event = await gateway<{ id?: string }>(
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: "Asia/Kuwait" },
        end: { dateTime: input.end, timeZone: "Asia/Kuwait" },
        attendees: [{ email: input.attendeeEmail }],
      }),
    },
  );
  return event.id ?? null;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovableKey || !connectionKey) return;

  const response = await fetch(
    `${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
    },
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const body = await response.text();
    console.error(`Google Calendar delete failed [${response.status}]: ${body}`);
  }
}
