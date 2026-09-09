import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createBooking,
  getDaySlots,
  getMonthOverview,
  type SlotOption,
} from "@/lib/booking.functions";
import { profile } from "@/lib/portfolio";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Kuwait has no daylight saving time, so a fixed offset is safe. */
function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00+03:00`).getUTCDay();
}

function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(new Date(`${day}T12:00:00+03:00`));
}

/** Smooth-scroll to the booking section; lets the router navigate otherwise. */
export function goToBooking(event: React.MouseEvent) {
  const booking = document.getElementById("book");
  if (booking) {
    event.preventDefault();
    booking.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function BookingSection() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getMonthOverview);
  const overview = useQuery({ queryKey: ["month-overview"], queryFn: () => fetchOverview() });

  const { data: userData } = useCurrentUser();
  const user = userData?.user ?? null;

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const fetchSlots = useServerFn(getDaySlots);
  const slots = useQuery({
    queryKey: ["day-slots", selectedDay],
    enabled: Boolean(selectedDay),
    queryFn: () => fetchSlots({ data: { day: selectedDay! } }),
  });

  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState<{ day: string; label: string; onCalendar: boolean } | null>(null);

  const doCreateBooking = useServerFn(createBooking);

  // Signed-in members get their details filled in automatically.
  useEffect(() => {
    if (userData?.user) {
      setName(userData.user.name);
      setEmail(userData.user.email);
    }
  }, [userData?.user?.id]);

  // Reset the picked slot when the day changes.
  useEffect(() => {
    setSelectedSlot(null);
    setConfirmed(null);
  }, [selectedDay]);

  const data = overview.data;

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot || !selectedDay) return;
    setPending(true);
    try {
      const result = await doCreateBooking({
        data: {
          start: selectedSlot.start,
          end: selectedSlot.end,
          name,
          email,
          note,
        },
      });
      setConfirmed({
        day: result.booking.day,
        label: selectedSlot.label,
        onCalendar: result.addedToCalendar,
      });
      toast.success("Your meeting is booked.");
      await queryClient.invalidateQueries({ queryKey: ["day-slots", selectedDay] });
      await queryClient.invalidateQueries({ queryKey: ["month-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not book that time.");
    } finally {
      setPending(false);
    }
  }

  function renderCalendar() {
    if (overview.isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading availability…
        </div>
      );
    }
    if (!data) {
      return <p className="py-6 text-sm text-muted-foreground">Could not load availability.</p>;
    }
    if (!data.databaseReady) {
      return (
        <p className="py-6 text-sm text-muted-foreground">
          The booking system isn&apos;t connected yet. Meanwhile you can reach Fahad on his{" "}
          <a href={profile.googleBookingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Google appointment page
          </a>
          .
        </p>
      );
    }

    const firstWeekday = weekdayOf(data.days[0].day);
    const monthLabel = new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kuwait",
    }).format(new Date(`${data.days[0].day}T12:00:00+03:00`));

    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-sm text-primary">{monthLabel}</p>
          <p className="text-xs text-muted-foreground">Kuwait time (GMT+3)</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {weekday}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {data.days.map((day) => {
            const isSelected = day.day === selectedDay;
            return (
              <button
                key={day.day}
                type="button"
                disabled={!day.bookable}
                onClick={() => setSelectedDay(day.day)}
                className={[
                  "aspect-square rounded-md text-sm transition-colors",
                  day.bookable
                    ? "hover:bg-accent hover:text-foreground cursor-pointer"
                    : "cursor-not-allowed text-muted-foreground/30",
                  day.day === data.today && !isSelected ? "ring-1 ring-primary/50" : "",
                  isSelected ? "bg-primary text-primary-foreground font-semibold" : "",
                ].join(" ")}
              >
                {Number(day.day.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section id="book" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Schedule</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Book a meeting</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Pick a free day this month, choose a time and leave your details. Signed-in members have
          theirs filled in automatically. You can also book directly on Fahad&apos;s{" "}
          <a
            href={profile.googleBookingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Google appointment page
          </a>
          .
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-6">{renderCalendar()}</CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-6">
            {!selectedDay && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a day to see the free times.
              </p>
            )}

            {selectedDay && !confirmed && (
              <>
                <p className="font-mono text-sm text-primary">{formatDay(selectedDay)}</p>
                <div className="mt-4">
                  {slots.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking times…
                    </div>
                  )}
                  {slots.data && slots.data.slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {slots.data.message ?? "No free times on this day."}
                    </p>
                  )}
                  {slots.data && slots.data.slots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.data.slots.map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={[
                            "rounded-md border border-border/60 px-2 py-2 font-mono text-sm transition-colors",
                            selectedSlot?.start === slot.start
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:border-primary/50 hover:bg-accent",
                          ].join(" ")}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSlot && (
                  <form className="mt-6 space-y-4" onSubmit={handleBook}>
                    <div className="space-y-2">
                      <Label htmlFor="booking-name">Your name</Label>
                      <Input
                        id="booking-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        minLength={2}
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-email">Email</Label>
                      <Input
                        id="booking-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-note">Note (optional)</Label>
                      <Textarea
                        id="booking-note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        maxLength={600}
                        placeholder="What would you like to talk about?"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={pending}>
                      {pending ? "Booking…" : `Confirm ${selectedSlot.label}`}
                    </Button>
                  </form>
                )}
              </>
            )}

            {selectedDay && confirmed && (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
                <p className="mt-4 text-lg font-semibold">You&apos;re booked</p>
                <p className="mt-1 font-mono text-sm text-primary">
                  {formatDay(confirmed.day)} · {confirmed.label} (Kuwait time)
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {confirmed.onCalendar
                    ? "A calendar invite is on its way from Google Calendar."
                    : "Your meeting request is saved. Fahad will confirm by email."}
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setConfirmed(null)}>
                  Book another time
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
