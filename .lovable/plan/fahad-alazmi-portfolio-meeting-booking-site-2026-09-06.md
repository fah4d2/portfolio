# Fahad Alazmi — Portfolio & Meeting Booking Site

A personal portfolio site that shows your background and lets anyone book a meeting on your Google Calendar, with an admin dashboard for you.

## What gets built

### 1. Portfolio home page
Content taken from your CV:
- Hero: Fahad E. M. S. Alazmi — Computer Science & Cybersecurity student, Kuwait, open to opportunities.
- Sections: Education (IUK, expected Spring 2027), Experience (Dar Al Shifa Hospital IT/Cybersecurity externship), Certifications (IELTS, three Cisco certs), Hackathons & workshops (Coded Kuwait 2023, 2024), Technical skills.
- Contact details: Alazmifahadeid@gmail.com, +965 6562 7601.
- A clear "Book a meeting" call to action.

### 2. Booking page
- A calendar showing only the current month, with past days disabled.
- Picking a day shows the free time slots for that day, checked live against your Google Calendar so busy times never appear.
- Guests fill in name, email and a short note. Signed-in visitors get their name and email filled in automatically.
- Confirming creates the event on your Google Calendar and saves the booking in the database.
- Sign-in is optional — guests can book without an account.

### 3. Sign up / sign in (optional for visitors)
- Sign up with name, username, email and password. Passwords are stored hashed, never in plain text.
- Sign in with email (or username) and password; session kept in a secure cookie.
- A small "My meetings" area where a signed-in visitor sees their upcoming bookings.

### 4. Admin dashboard (you)
- Sign in with Alazmifahadeid@gmail.com. You set the password on first run, from a one-time setup screen — so no password travels through chat.
- See all bookings (upcoming and past), with guest details and status; cancel a booking (also removes it from your calendar).
- See registered users.
- Set your availability: working days, working hours, meeting length, buffer between meetings.
- Change your email and password.

### 5. AI assistant (OpenRouter)
A chat widget on the site that answers questions about your background and certifications, and helps visitors book: understands "next Tuesday afternoon", checks real availability, and offers matching slots to confirm. It reads only public portfolio info and free/busy slots — never other people's personal details.

## Google Calendar

Your Google account gets connected once at the project level, and every booking lands on your calendar. You'll get an approval prompt to authorize it — nothing to configure by hand.

## About the MongoDB database

You chose to keep MongoDB. Important: this app's server runs in an environment that cannot open a direct database connection to Atlas, so it cannot use your connection string directly. The plan therefore has two parts:

1. **The website** (built here) talks to a small "data bridge" over HTTPS, protected by a shared secret key.
2. **The data bridge** (a small Node service I will also write for you, in a `bridge/` folder with deploy instructions) holds your Atlas connection string and runs the actual database operations. You deploy it once to a free host such as Render or Railway, then paste its address and secret key into the site's settings.

Until the bridge is deployed, the site will show a clear "database not configured" state rather than fake data. If at any point you'd rather skip that extra service, say so and I can switch to the built-in Lovable Cloud database in one step.

Also: the connection string you pasted in chat is now exposed. Please rotate that Atlas user's password before going live, and give the new one only to the bridge service.

Note: MCP connectors are a tool for the Lovable chat editor, not something a published website can use at runtime — so the site uses the official Google Calendar integration, which is the working equivalent.

## Technical outline

- **Stack**: TanStack Start (React 19) frontend + server functions; Tailwind v4 design tokens; dark, cyber-security-flavoured theme (deep slate/teal, mono accents) — not a generic template look.
- **Data access**: `src/lib/db.server.ts` — typed HTTP client for the bridge (`find`, `findOne`, `insert`, `update`, `delete`), signed with `BRIDGE_SECRET`; secrets `MONGO_BRIDGE_URL`, `MONGO_BRIDGE_SECRET` requested via the secure secrets form.
- **Bridge service**: `bridge/` — Express + official MongoDB driver, one authenticated `/query` endpoint with an allowlist of collections and operations, `README.md` with Render/Railway deploy steps and env vars (`MONGODB_URI`, `BRIDGE_SECRET`).
- **Collections**: `users` (name, username, email, passwordHash, role, createdAt), `bookings` (day, start, end, guest info, userId?, googleEventId, status), `settings` (availability, admin config).
- **Auth**: hand-rolled, Workers-safe — PBKDF2-SHA256 via Web Crypto for password hashing, HMAC-signed session cookie (HttpOnly, Secure, SameSite=Lax), `requireUser` / `requireAdmin` middleware on every protected server function. Route guards via a pathless `_authenticated` layout plus an `_admin` layout.
- **Calendar**: Google Calendar App connector via `standard_connectors--connect`; server-only helpers call freeBusy for slot availability and events.insert / events.delete for booking and cancellation. Slot generation is server-side from the availability settings, then filtered by busy periods; double-booking guarded by a unique index on `bookings.start`.
- **AI**: server route `src/routes/api/chat.ts` streaming from OpenRouter with the existing `OPENROUTER_API_KEY`; tool calls for `getAvailability` and `createBooking`, portfolio facts in the system prompt. Errors surfaced in the UI, never silently swallowed.
- **SEO**: per-route `head()` with unique title/description/OG tags; single H1; semantic sections; JSON-LD `Person` schema on the home page.

## Order of work

1. Design system + portfolio home page.
2. Bridge service code and deploy README; request the bridge secrets.
3. Auth (sign up, sign in, sessions, admin first-run setup).
4. Google Calendar connection + booking page with month calendar and slots.
5. Admin dashboard (bookings, users, availability, credentials).
6. AI assistant.
