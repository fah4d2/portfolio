import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create an account — Fahad Alazmi" },
      {
        name: "description",
        content:
          "Create a free account to book meetings with Fahad Alazmi faster and keep track of them in one place.",
      },
      { property: "og:title", content: "Create an account — Fahad Alazmi" },
      { property: "og:description", content: "Sign up with your name, email and a password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const doSignUp = useServerFn(signUp);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await doSignUp({
        data: {
          name: String(form.get("name") ?? ""),
          username: String(form.get("username") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(`Account created — welcome, ${result.user.name.split(" ")[0]}`);
      router.navigate({ to: "/", hash: "#book" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-16">
        <Card className="w-full border-border/60 bg-card/60">
          <CardContent className="p-7">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Optional, but it fills your details in automatically every time you book.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" autoComplete="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
