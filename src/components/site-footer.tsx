import { Mail, MapPin, Phone } from "lucide-react";

import { profile } from "@/lib/portfolio";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-foreground">{profile.name}</p>
          <p className="mt-1">{profile.title}</p>
        </div>
        <div className="flex flex-col gap-2">
          <a href={`mailto:${profile.email}`} className="flex items-center gap-2 hover:text-primary">
            <Mail className="h-4 w-4" aria-hidden /> {profile.email}
          </a>
          <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-primary">
            <Phone className="h-4 w-4" aria-hidden /> {profile.phone}
          </a>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden /> {profile.location}
          </p>
        </div>
      </div>
    </footer>
  );
}
