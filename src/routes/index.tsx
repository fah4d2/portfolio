import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Award, Braces, CalendarClock, GraduationCap, Hospital, Terminal } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingSection, goToBooking } from "@/components/booking-section";
import { ChatWidget } from "@/components/chat-widget";
import { certifications, education, events, experience, profile, skillGroups } from "@/lib/portfolio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fahad Alazmi — Cybersecurity & Computer Science Portfolio" },
      {
        name: "description",
        content:
          "Portfolio of Fahad E. M. S. Alazmi, computer science and cybersecurity undergraduate in Kuwait. Cisco certified, incident response experience, open to opportunities. Book a meeting directly.",
      },
      { property: "og:title", content: "Fahad Alazmi — Cybersecurity & Computer Science Portfolio" },
      {
        property: "og:description",
        content:
          "Cisco certified cybersecurity student in Kuwait, open to internships and opportunities. See the full profile and book a meeting.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name,
          jobTitle: profile.title,
          email: `mailto:${profile.email}`,
          telephone: profile.phone,
          address: { "@type": "PostalAddress", addressCountry: "KW" },
          alumniOf: "International University of Kuwait",
        }),
      },
    ],
  }),
  component: Home,
});

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    </div>
  );
}

function Home() {
  useEffect(() => {
    if (window.location.hash === "#book") {
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, oklch(0.79 0.14 183 / 0.18), transparent 45%), radial-gradient(circle at 80% 0%, oklch(0.7 0.13 250 / 0.16), transparent 40%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {profile.openToWork}
            </Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              {profile.name}
            </h1>
            <p className="mt-3 font-mono text-sm text-primary sm:text-base">
              {profile.title} · {profile.location}
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {profile.summary}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/" onClick={goToBooking}>
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  Book a meeting
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`mailto:${profile.email}`}>
                  Email me
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Education & experience */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading label="Background" title="Education & experience" />
          <div className="grid gap-5 md:grid-cols-2">
            {education.map((item) => (
              <Card key={item.school} className="border-border/60 bg-card/60">
                <CardContent className="p-6">
                  <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">{item.degree}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.school}</p>
                  <p className="mt-3 font-mono text-xs text-primary">{item.timeline}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.details}</p>
                </CardContent>
              </Card>
            ))}
            {experience.map((item) => (
              <Card key={item.org} className="border-border/60 bg-card/60">
                <CardContent className="p-6">
                  <Hospital className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">{item.role}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.org}</p>
                  <p className="mt-3 font-mono text-xs text-primary">{item.timeline}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {item.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className="border-y border-border/60 bg-card/30">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <SectionHeading label="Credentials" title="Professional certifications" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {certifications.map((cert) => (
                <Card key={cert.name} className="border-border/60 bg-background/60">
                  <CardContent className="p-5">
                    <Award className="h-5 w-5 text-primary" aria-hidden />
                    <p className="mt-4 text-sm font-medium leading-snug">{cert.name}</p>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{cert.issued}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Hackathons */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading label="Community" title="Workshops & hackathons" />
          <div className="space-y-4">
            {events.map((item) => (
              <Card key={item.name} className="border-border/60 bg-card/60">
                <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:gap-8">
                  <div className="md:w-56 md:shrink-0">
                    <Terminal className="h-5 w-5 text-primary" aria-hidden />
                    <p className="mt-3 font-mono text-xs text-primary">{item.timeline}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold leading-snug">{item.name}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="border-t border-border/60 bg-card/30">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <SectionHeading label="Toolkit" title="Technical skills" />
            <div className="grid gap-5 md:grid-cols-3">
              {skillGroups.map((group) => (
                <Card key={group.label} className="border-border/60 bg-background/60">
                  <CardContent className="p-6">
                    <Braces className="h-5 w-5 text-primary" aria-hidden />
                    <h3 className="mt-4 font-mono text-sm uppercase tracking-widest text-primary">
                      {group.label}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Badge key={item} variant="secondary" className="font-normal">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <BookingSection />
      </main>

      <ChatWidget />
      <SiteFooter />
    </div>
  );
}
