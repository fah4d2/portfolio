# Mongo data bridge

The website runs on an edge runtime that cannot open a direct connection to
MongoDB Atlas. This small service does it instead: the website calls it over
HTTPS with a shared secret, and it talks to your Atlas cluster.

You deploy this **once**.

## What you need

- Your Atlas connection string (rotate the password first — the one shared in
  chat should be considered exposed).
- A long random secret. Generate one with:
  `openssl rand -hex 32`

## Deploy on Render (free)

1. Put this `bridge` folder in its own GitHub repository.
2. On https://render.com → **New → Web Service** → pick that repository.
3. Settings:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm start`
4. Environment variables:
   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | your Atlas connection string |
   | `BRIDGE_SECRET` | the random secret you generated |
   | `MONGODB_DB` | `portfolio` (optional) |
5. In Atlas → **Network Access**, allow access from anywhere (`0.0.0.0/0`) or
   from Render's outbound IPs.
6. Deploy. Open `https://<your-service>.onrender.com/health` — it should show
   `{"ok":true}`.

Railway, Fly.io, Heroku or a small VPS work the same way.

## Then, back in the website

Save two secrets in the Lovable project:

- `MONGO_BRIDGE_URL` → `https://<your-service>.onrender.com`
- `MONGO_BRIDGE_SECRET` → the same random secret

The site will start reading and writing your Atlas database immediately.

## Security notes

- Only the `users`, `bookings` and `settings` collections are reachable, and
  only through a fixed list of operations.
- Every request must carry the `x-bridge-secret` header.
- The Atlas connection string never leaves this service.
