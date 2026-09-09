import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cancelMyBooking, getMyBookings } from "@/lib/booking.functions";
import { goToBooking } from "@/components/booking-section";

export const Route = createFileRoute("/my-meetings")({
  head: () => ({
    meta: [
      { title: "My meetings — Fahad Alazmi" },
      {
        name: "description",
        content: "See and manage the meetings you booked with Fahad Alazmi.",
      },
    ],
  }),
  component: MyMeetingsPage,
});

function formatSlot(day: string, start: string, end: string): string {
  const date = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(new Date(`${day}T12:00:00+03:00`));
  const time = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuwait",
  });
  return `${date} · ${time.format(new Date(start))}–${time.format(new Date(end))} (Kuwait time)`;
}

function MyMeetingsPage() {
  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const user = userData?.user ?? null;
  const queryClient = useQueryClient();
  const fetchMyBookings = useServerFn(getMyBookings);
  const doCancel = useServerFn(cancelMyBooking);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const bookings = useQuery({
    queryKey: ["my-bookings"],
    enabled: Boolean(user),
    queryFn: () => fetchMyBookings(),
  });

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-16">
          <Card className="w-full border-border/60 bg-card/60">
            <CardContent className="p-7 text-center">
              <h1 className="text-xl font-semibold tracking-tight">Your meetings</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to see the meetings you booked — or book as a guest anytime.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <Link to="/" onClick={goToBooking}>
                  Book as a guest
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const now = Date.now();
  const all = bookings.data?.bookings ?? [];
  const upcoming = all.filter(
    (booking) => booking.status === "confirmed" && Date.parse(booking.end) >= now,
  );
  const others = all
    .filter(
      (booking) => booking.status !== "confirmed" || Date.parse(booking.end) < now,
    )
    .reverse();

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this meeting?")) return;
    setPendingId(id);
    try {
      await doCancel({ data: { id } });
      toast.success("Meeting cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the meeting.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve booked with Fahad.
        </p>

        {bookings.isLoading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </div>
        )}

        {!bookings.isLoading && all.length === 0 && (
          <Card className="mt-8 border-border/60 bg-card/60">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No meetings yet.{" "}
              <Link to="/" onClick={goToBooking} className="text-primary hover:underline">
                Book one
              </Link>
              .
            </CardContent>
          </Card>
        )}

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-primary">
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <Card key={booking._id} className="border-border/60 bg-card/60">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-sm text-primary">
                        {formatSlot(booking.day, booking.start, booking.end)}
                      </p>
                      {booking.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{booking.note}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === booking._id}
                      onClick={() => handleCancel(booking._id)}
                    >
                      {pendingId === booking._id ? "Cancelling…" : "Cancel"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-primary">
              Past &amp; cancelled
            </h2>
            <div className="space-y-3">
              {others.map((booking) => (
                <Card key={booking._id} className="border-border/60 bg-card/60 opacity-70">
                  <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-mono text-sm text-muted-foreground">
                      {formatSlot(booking.day, booking.start, booking.end)}
                    </p>
                    <Badge variant="secondary">{booking.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
