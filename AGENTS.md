<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- BASE44:BEGIN -->
## Base44 dev environment

Run everything with `docker compose -f docker-compose.base44.yml up -d`.

Architecture (two app services + two one-shot installers):

- **web** — TanStack Start (React 19 + Vite dev + SSR via nitro) on host port
  3000. Source is bind-mounted; edits hot-reload without restarts. Deps live in
  the `web_node_modules` named volume, installed by the `web-setup` one-shot
  service (never inside the running container).
- **bridge** — Express service (internal only, no public port) that proxies
  MongoDB Atlas. Started by `bridge-setup`. `MONGODB_URI` comes from the
  platform secret file; without it the bridge exits (restart capped at 5).

Non-obvious points:

- The web app talks to the bridge **server-to-server** over the docker network
  (`MONGO_BRIDGE_URL=http://bridge:8787`); no CORS/public URL involved.
- `BRIDGE_SECRET` (compose YAML anchor `x-bridge-secret`) is an internal
  dev-only shared secret and must match on both services. `SESSION_SECRET`
  falls back to `MONGO_BRIDGE_SECRET` (see `src/lib/auth.server.ts`).
- `vite.config.ts` sets `server.allowedHosts: true` — required for the Base44
  preview proxy, which reaches the dev server via a changing external hostname.
  Removing it makes the preview 403.
- Google Calendar integration is intentionally OFF (owner opted out): no
  Lovable/Google API keys are used, bookings live in MongoDB only, and the
  booking UI links to the owner's public Google appointment page instead.
- `README.md` mentions an OpenRouter assistant, but no code uses
  `OPENROUTER_API_KEY` — it is not requested and not needed to run.
- The repo has `bun.lock`, but the docker setup installs with **npm** —
  `bunfig.toml`'s 24h `minimumReleaseAge` guard can block fresh installs of
  recently published packages.
- Admin account is created on first run via a one-time setup screen
  (`getAdminSetupState` / `createAdminAccount`), not seeded.
- Route note: only `/`, `/signin`, `/signup` exist in this snapshot; the home
  page links to `/book` which 404s until that route is added.
- Verify the stack: `docker compose -f docker-compose.base44.yml ps` shows
  web+bridge healthy; `curl -sf http://localhost:3000/` returns the SSR'd
  portfolio page; a bridge query (`users.countDocuments`) should return
  `{"result":0}` on a fresh database.
<!-- BASE44:END -->
