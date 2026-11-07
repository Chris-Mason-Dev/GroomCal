# GroomCal

A shared scheduling calendar and client manager for a two-groomer dog grooming business. Built as a lightweight Node.js/Express app with no build step, architected to deploy **entirely for free on Netlify**.

## Live site

**https://groomcal.netlify.app**

- Deployed from [github.com/Chris-Mason-Dev/GroomCal](https://github.com/Chris-Mason-Dev/GroomCal) — every push to `main` auto-deploys
- Database: Turso project `groomcal` (free tier, US East)
- ⚠️ **Change the default groomer passwords before entering real client data** — see [Local development](#local-development) below for the default logins. There's no in-app "change password" screen yet.

## Features

- **Login** for each groomer (JWT in an httpOnly cookie)
- **Shared calendar** with Day / Week / Month views (click the toolbar buttons, or the arrows to move through time)
- **Click any appointment** to see its details in a popup — client, pet, phone, service, time, groomer, and notes
- **Edit button** on the popup opens a full edit form; changes save immediately to the shared calendar
- **New Appointment** button, or click/tap any empty time slot on the calendar, to create one
- **Groomer filter chips** above the calendar to show one groomer's appointments, both, or toggle between them — appointments are color-coded per groomer
- **Clients page** to store owner contact info, notes, and each client's pets (name, breed, size)

## Project structure

```
GroomCal/
├── public/            # Static frontend (vanilla HTML/CSS/JS, FullCalendar via CDN)
│   ├── login.html, calendar.html, clients.html
│   ├── css/styles.css # Grey / teal / near-black theme
│   └── js/            # api.js (fetch wrapper), layout.js, calendar.js, clients.js
├── server/
│   ├── app.js          # Configured Express app (routes only, no listen())
│   ├── index.js         # Local dev entry point: adds static serving + listen()
│   ├── db/              # @libsql/client setup, schema, seed data
│   ├── middleware/       # JWT auth middleware
│   └── routes/           # auth + clients/appointments/groomers API routes
├── netlify/functions/api.js  # Wraps server/app.js for Netlify Functions
├── netlify.toml           # Netlify build + redirect config
└── .env.example             # Documents every environment variable
```

## Local development

Requires Node.js 18+.

```bash
npm install
npm start
```

The server starts at **http://localhost:3000**. On first run it creates `data/groomcal.db` and seeds two default groomer logins:

- `groomer1` / `ChangeMe123!`
- `groomer2` / `ChangeMe123!`

**Change these passwords before entering real client data.** There's no in-app "change password" screen yet — easiest way for now is to delete the two seeded rows and re-insert them with a new bcrypt hash, or ask your developer to add a change-password endpoint.

For auto-restart on file changes: `npm run dev`

## Deploying for free (Netlify + Turso)

The live site above is already deployed this way — these steps are for redeploying elsewhere (a fresh account, a fork, etc.) or for reference. This mirrors the same free-hosting pattern already used by the `groomer-has-it` project in this workspace.

### 1. Create a free Turso database (persistent hosted SQLite)

Turso's free tier has no time limit — it stays up as long as the account is active, unlike some other free database trials that expire after 90 days.

1. Install the CLI and sign up yourself at [turso.tech](https://turso.tech) (web dashboard) or via CLI: `curl -sSfL https://get.tur.so/install.sh | bash`, then `turso auth login`
2. `turso db create groomcal`
3. `turso db show groomcal --url` → this is your `TURSO_DATABASE_URL`
4. `turso db tokens create groomcal` → this is your `TURSO_AUTH_TOKEN`

### 2. Generate a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Create a free Netlify account and deploy

1. Push this project to a GitHub repo
2. In Netlify: **Add new site → Import an existing project** → pick the repo (Netlify auto-detects `netlify.toml`, no build settings to change)
3. Before or right after the first deploy, go to **Site configuration → Environment variables** and add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
4. Deploy. The first request to any `/api/*` route creates the schema and seeds the two default groomer logins automatically.
5. Visit `https://<your-site>.netlify.app` and log in.
6. Netlify assigns a random subdomain at first (e.g. `elaborate-dusk-061289.netlify.app`). Rename it for free under **Project configuration → General → Change project name** — this is how the live site above got its `groomcal.netlify.app` URL. Attach your own domain the same way later, free, once you've purchased one — no migration needed.
7. New Netlify projects default to **Private** (visible only to your team). Go to **Project configuration → General → Visitor access → Edit visibility** and switch to **Public** (applies to "Production and previews") so both groomers can reach it without a Netlify login.

### Testing the Netlify Functions locally (optional)

```bash
npm install -g netlify-cli
netlify dev
```

## Notes

- Netlify Functions have no persistent disk, which is why the database lives on Turso instead of a local file in production.
- Served over HTTPS by Netlify automatically — the auth cookie is marked `secure` in production.
- Both groomers see the same shared calendar; the groomer filter chips only affect what's shown on screen, not who owns the data.
