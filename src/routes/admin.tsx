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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAdminAccount,
  getAllUsers,
  getAdminSetupState,
  updateAdminCredentials,
} from "@/lib/auth.functions";
import { cancelMyBooking, getAllBookings } from "@/lib/booking.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fahad Alazmi" },
      {
        name: "description",
        content: "Admin dashboard — manage meeting bookings, registered users and account settings.",
      },
    ],
  }),
  component: AdminPage,
});

function formatDate(day: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(new Date(`${day}T12:00:00+03:00`));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuwait",
  }).format(new Date(iso));
}

function AdminPage() {
  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const user = userData?.user ?? null;

  const fetchSetupState = useServerFn(getAdminSetupState);
  const setup = useQuery({ queryKey: ["admin-setup"], queryFn: () => fetchSetupState() });

  if (userLoading || setup.isLoading) {
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

  const setupState = setup.data;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookings, registered users and your account settings.
        </p>

        {!setupState?.databaseReady && (
          <Card className="mt-8 border-border/60 bg-card/60">
            <CardContent className="p-6 text-sm text-muted-foreground">
              The database isn&apos;t connected yet, so there is nothing to manage here.
            </CardContent>
          </Card>
        )}

        {setupState?.databaseReady && !setupState.adminExists && <AdminSetupForm />}

        {setupState?.databaseReady && setupState.adminExists && (!user || user.role !== "admin") && (
          <Card className="mt-8 border-border/60 bg-card/60">
            <CardContent className="p-6 text-sm text-muted-foreground">
              This area is for the site owner.{" "}
              {!user && (
                <>
                  <Link to="/signin" className="text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  with the admin account to manage bookings.
                </>
              )}
            </CardContent>
          </Card>
        )}

        {setupState?.databaseReady &&
          setupState.adminExists &&
          user?.role === "admin" && <AdminDashboard />}
      </main>
      <SiteFooter />
    </div>
  );
}

function AdminSetupForm() {
  const queryClient = useQueryClient();
  const doCreateAdmin = useServerFn(createAdminAccount);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await doCreateAdmin({
        data: {
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-setup"] });
      toast.success("Admin account created — welcome aboard.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the admin account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mt-8 max-w-md border-primary/40 bg-primary/5">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">One-time setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the owner account. Pick the username and password you&apos;ll sign in with — you
          can change them later from this dashboard.
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-username">Username</Label>
            <Input id="admin-username" name="username" defaultValue="fah4d2" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create admin account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const fetchBookings = useServerFn(getAllBookings);
  const fetchUsers = useServerFn(getAllUsers);
  const doCancelBooking = useServerFn(cancelMyBooking);
  const doUpdateCredentials = useServerFn(updateAdminCredentials);
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const bookings = useQuery({ queryKey: ["admin-bookings"], queryFn: () => fetchBookings() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const [pending, setPending] = useState(false);

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await doCancelBooking({ data: { id } });
      toast.success("Meeting cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the meeting.");
    }
  }

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await doUpdateCredentials({
        data: {
          currentPassword: String(form.get("currentPassword") ?? ""),
          email: String(form.get("email") ?? "") || undefined,
          username: String(form.get("username") ?? "") || undefined,
          newPassword: String(form.get("newPassword") ?? "") || undefined,
        },
      });
      if (result.changed) {
        toast.success("Account updated.");
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      } else {
        toast.info("Nothing to change.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Bookings */}
      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-primary">Bookings</h2>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            {bookings.isLoading && (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading bookings…
              </div>
            )}
            {bookings.data && bookings.data.bookings.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No bookings yet.</p>
            )}
            {bookings.data && bookings.data.bookings.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.data.bookings.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">{formatDate(booking.day)}</span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {formatTime(booking.start)}–{formatTime(booking.end)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block">{booking.guestName}</span>
                        <span className="block text-xs text-muted-foreground">{booking.guestEmail}</span>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {booking.note || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status === "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(booking._id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Users */}
      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-primary">
          Registered users
        </h2>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            {users.isLoading && (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading users…
              </div>
            )}
            {users.data && users.data.users.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No registered users yet.</p>
            )}
            {users.data && users.data.users.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.users.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.username}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant={row.role === "admin" ? "default" : "secondary"}>
                          {row.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.createdAt.slice(0, 10))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-primary">
          Account settings
        </h2>
        <Card className="max-w-md border-border/60 bg-card/60">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Change your email, username or password. Enter your current password to confirm.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleCredentials}>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  name="email"
                  type="email"
                  defaultValue={user?.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-username">Username</Label>
                <Input id="account-username" name="username" defaultValue={user?.username} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep your current password.
                </p>
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
