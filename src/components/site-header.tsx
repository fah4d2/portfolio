import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { goToBooking } from "@/components/booking-section";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth.functions";
import { useCurrentUser } from "@/hooks/use-current-user";

export function SiteHeader() {
  const { data } = useCurrentUser();
  const user = data?.user ?? null;
  const doSignOut = useServerFn(signOut);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    await doSignOut();
    queryClient.clear();
    await router.invalidate();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm tracking-tight">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-semibold">fahad.alazmi</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/"
            onClick={goToBooking}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Book a meeting
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Dashboard
            </Link>
          )}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                to="/my-meetings"
                className="font-mono text-xs text-primary hover:underline"
              >
                {user.username}
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/" onClick={goToBooking}>
                  Book a meeting
                </Link>
              </Button>
            </div>
          )}
        </nav>

        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border/60 px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/"
              onClick={(event) => {
                setOpen(false);
                goToBooking(event);
              }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Book a meeting
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm">
                Dashboard
              </Link>
            )}
            {user ? (
              <>
                <Link to="/my-meetings" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm">
                  My meetings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm">
                  Sign in
                </Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm">
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
