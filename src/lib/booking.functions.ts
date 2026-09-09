import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSessionUser, requireAdmin, requireUser } from "./auth.server";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getBusyIntervals,
  isCalendarConfigured,
  KUWAIT_OFFSET,
} from "./calendar.server";
import { db, getSettings, isDatabaseConfigured, type BookingDoc } from "./db.server";

const TZ = "Asia/Kuwait";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Current date in Kuwait as yyyy-MM-dd. */
function kuwaitToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00${KUWAIT_OFFSET}`);
}

function weekdayOf(day: string): number {
  return dayToDate(day).getUTCDay() === 0 && false ? 0 : new Date(`${day}T12:00:00${KUWAIT_OFFSET}`).getUTCDay();
}

function slotIso(day: string, minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${day}T${pad(hour)}:${pad(minute)}:00${KUWAIT_OFFSET}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** Returns the days of the current Kuwait month with a bookable flag. */
export const getMonthOverview = createServerFn({ method: "GET" }).handler(async () => {
  const today = kuwaitToday();
  const [yearStr, monthStr] = today.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const settings = await (isDatabaseConfigured() ? getSettings() : Promise.resolve(null));
  const workingDays = settings?.workingDays ?? [0, 1, 2, 3, 4];

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = `${year}-${pad(month)}-${pad(index + 1)}`;
    const isPast = day < today;
    return {
      day,
      isPast,
      bookable: !isPast && workingDays.includes(weekdayOf(day)),
    };
  });

  return {
    month,
    year,
    today,
    days,
    timezone: settings?.timezone ?? TZ,
    calendarReady: isCalendarConfigured(),
    databaseReady: isDatabaseConfigured(),
  };
});

const daySchema = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export type SlotOption = { start: string; end: string; label: string };

export const getDaySlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => daySchema.parse(input))
  .handler(async ({ data }): Promise<{ slots: SlotOption[]; message?: string }> => {
    const today = kuwaitToday();
    if (data.day < today) return { slots: [], message: "That day has already passed." };

    const settings = isDatabaseConfigured()
      ? await getSettings()
      : {
          workingDays: [0, 1, 2, 3, 4],
          startHour: 10,
          endHour: 18,
          slotMinutes: 30,
          bufferMinutes: 0,
        };

    if (!settings.workingDays.includes(weekdayOf(data.day))) {
      return { slots: [], message: "I don't take meetings on this weekday." };
    }

    const dayStart = `${data.day}T00:00:00${KUWAIT_OFFSET}`;
    const dayEnd = `${data.day}T23:59:59${KUWAIT_OFFSET}`;

    let busy: { start: number; end: number }[] = [];
    if (isCalendarConfigured()) {
      try {
        const intervals = await getBusyIntervals(dayStart, dayEnd);
        busy = intervals.map((interval) => ({
          start: Date.parse(interval.start),
          end: Date.parse(interval.end),
        }));
      } catch (error) {
        console.error("free/busy lookup failed", error);
      }
    }

    if (isDatabaseConfigured()) {
      const existing = await db.find<BookingDoc>("bookings", {
        day: data.day,
        status: "confirmed",
      });
      busy = busy.concat(
        existing.map((booking) => ({
          start: Date.parse(booking.start),
          end: Date.parse(booking.end),
        })),
      );
    }

    const now = Date.now();
    const slots: SlotOption[] = [];
    for (
      let minutes = settings.startHour * 60;
      minutes + settings.slotMinutes <= settings.endHour * 60;
      minutes += settings.slotMinutes + settings.bufferMinutes
    ) {
      const start = slotIso(data.day, minutes);
      const end = slotIso(data.day, minutes + settings.slotMinutes);
      const startMs = Date.parse(start);
      const endMs = Date.parse(end);
      if (startMs <= now) continue;
      if (busy.some((interval) => overlaps(startMs, endMs, interval.start, interval.end))) continue;
      slots.push({
        start,
        end,
        label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
      });
    }

    return {
      slots,
      ...(slots.length === 0 ? { message: "No free times left on this day." } : {}),
    };
  });

const bookingSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  note: z.string().trim().max(600).optional().default(""),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const startMs = Date.parse(data.start);
    const endMs = Date.parse(data.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new Error("That time slot is not valid.");
    }
    if (startMs <= Date.now()) throw new Error("That time has already passed.");

    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(startMs));

    const user = await getSessionUser();

    // Re-check availability right before writing.
    if (isDatabaseConfigured()) {
      const existing = await db.find<BookingDoc>("bookings", { day, status: "confirmed" });
      const clash = existing.some((booking) =>
        overlaps(startMs, endMs, Date.parse(booking.start), Date.parse(booking.end)),
      );
      if (clash) throw new Error("Someone just took that time. Please pick another slot.");
    }

    let googleEventId: string | null = null;
    if (isCalendarConfigured()) {
      try {
        googleEventId = await createCalendarEvent({
          summary: `Meeting with ${data.name}`,
          description: [`Booked from the portfolio website.`, data.note].filter(Boolean).join("\n\n"),
          start: data.start,
          end: data.end,
          attendeeEmail: data.email,
        });
      } catch (error) {
        console.error("calendar event creation failed", error);
      }
    }

    const booking: BookingDoc = {
      _id: crypto.randomUUID(),
      day,
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      guestName: data.name,
      guestEmail: data.email,
      note: data.note ?? "",
      userId: user?.id ?? null,
      googleEventId,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseConfigured()) {
      await db.insertOne("bookings", booking);
    }

    return {
      booking: {
        id: booking._id,
        day: booking.day,
        start: booking.start,
        end: booking.end,
      },
      addedToCalendar: Boolean(googleEventId),
      saved: isDatabaseConfigured(),
    };
  });

export const getMyBookings = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const bookings = await db.find<BookingDoc>(
    "bookings",
    { userId: user.id },
    { sort: { start: 1 } },
  );
  return { bookings };
});

const cancelSchema = z.object({ id: z.string().min(1) });

export const cancelMyBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cancelSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const booking = await db.findOne<BookingDoc>("bookings", { _id: data.id });
    if (!booking) throw new Error("Meeting not found.");
    if (booking.userId !== user.id && user.role !== "admin") {
      throw new Error("You can only cancel your own meetings.");
    }
    if (booking.googleEventId) await deleteCalendarEvent(booking.googleEventId);
    await db.updateOne("bookings", { _id: booking._id }, { $set: { status: "cancelled" } });
    return { ok: true };
  });

export const getAllBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const bookings = await db.find<BookingDoc>("bookings", {}, { sort: { start: -1 }, limit: 300 });
  return { bookings };
});
