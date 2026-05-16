# AI Fitness Tracker

A unified diet + training tracker that merges the original **Diet & Grocery Manager** and **Workout Helper** apps into one connected React/Vite app.

## Stack

- React 18 + Vite
- Tailwind CSS 3
- lucide-react icons
- localStorage for app data (prefix `aift:`)
- Vercel serverless functions in `/api/` for AI calls (photo macros + eat-out suggestions)

## AI provider setup (Vercel)

Photo macros (`/api/analyze-photo`) and eat-out suggestions (`/api/suggest-eatout`) call an LLM server-side. The provider is **OpenRouter**; the key lives only in Vercel env vars, never in the browser. One required variable:

| Variable | Required? | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ Required | Your OpenRouter key (`sk-or-v1-…`). |
| `OPENROUTER_MODEL` | Optional | Defaults to `google/gemini-2.0-flash-exp:free` — free, supports vision + JSON. Override to switch routes (e.g. `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct:free`). |
| `OPENROUTER_REFERER` / `OPENROUTER_TITLE` | Optional | OpenRouter attribution headers. Set automatically with sensible defaults. |

Add in Vercel → Project → Settings → Environment Variables → tick Production / Preview / Development → **Redeploy** (env-var changes don't reach running functions without a fresh deploy).

The default free Gemini route handles both the vision task (photo macros) and the structured-JSON task (eat-out suggestions). Browse other routes at https://openrouter.ai/models.

## Cloud sync (Postgres) — optional

Without this section the app runs purely on browser localStorage (per-device, ~5 MB cap). Configure these three env vars to add a personal Postgres backup with explicit Push / Pull buttons on the Profile tab.

### 1. Provision a Postgres database

Any provider that gives you a `postgres://…` URL works. Tested:
- **Neon** (recommended — free tier, serverless): create a project at https://neon.tech, copy the connection string. Make sure it has `?sslmode=require` at the end.
- **Vercel Postgres**: enable from your Vercel dashboard; it gives you `POSTGRES_URL` automatically — copy it as `DATABASE_URL`.
- **Supabase**: project → Settings → Database → Connection string (URI mode).
- **Self-hosted**: any reachable Postgres 13+; just add `?sslmode=disable` to the URL if it's not behind TLS.

### 2. Apply the schema

The schema is one file, [`db/schema.sql`](db/schema.sql). Run it once against your database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

It creates a single table `kv (key text primary key, value jsonb, updated_at timestamptz)` plus a touch trigger.

### 3. Set Vercel env vars

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | The Postgres connection string from step 1 |
| `SESSION_SECRET` | Random 32-byte hex used to sign session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Set both in Vercel project → Settings → Environment Variables (or `.env.local` for local dev), then redeploy.

### 4. Use it

Open the app → **Profile** tab → top of the page is the **Account** card. Create an account with email + password (each user gets their own private slice of the `kv` table). After sign-in:

- The local cache is wiped and rehydrated from your account in Postgres.
- Every subsequent change (meals, workouts, weight, photos, …) auto-saves to your account in the background — debounced ~600 ms, batched into one `/api/kv/bulk` call. No buttons to press.
- Sign in on another device with the same email/password to load the same data.

Multiple users share the same deployment safely; rows are scoped by `kv.user_id`. Sign-out clears the local cache so the next account on the same browser starts fresh.

Photos are stored as base64 in `kv.value` (jsonb). Postgres handles MB-scale rows fine, but if you accumulate hundreds of photos consider migrating that one key to object storage (S3 / R2 / Vercel Blob).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Architecture

A single `AppProvider` context owns all shared state and persists it to localStorage. Every page reads from it via `useApp()`.

```
src/
├── App.jsx              # Tab router
├── store/
│   ├── AppContext.jsx   # Profile + Diet + Workout + Grocery state
│   ├── storage.js       # localStorage shim (aift: prefix)
│   └── defaults.js      # Built-in programs, food library, default grocery
├── lib/
│   ├── calories.js      # BMR, TDEE, daily target, workout kcal estimate
│   └── time.js          # Date helpers, MM:SS format
├── components/
│   ├── Layout.jsx       # Top masthead + tab nav
│   └── ui/              # Card, Button, Modal, Field primitives
└── pages/
    ├── Dashboard.jsx    # Cross-module today snapshot
    ├── Diet.jsx         # Meal logging by slot
    ├── Workout.jsx      # Today's session, set tracking, rest timer
    ├── Programs.jsx     # Program list + editor
    ├── History.jsx      # Past sessions
    ├── Grocery.jsx      # Inventory + shopping list
    └── Profile.jsx      # Shared user profile
```

## How the modules connect

1. **Shared profile** — One `profile` object (weight, height, age, sex, activity, goal, protein target) drives both diet targets and workout calorie estimates.
2. **Unified dashboard** — Shows today's eaten kcal vs. (target + workout-kcal-burned), macro progress, this-week training stats, and a profile snapshot.
3. **Cross-module data flow** —
   - Diet target = `dailyTarget(profile) + todaysWorkoutKcal`. Training adds calories to your daily budget automatically.
   - Workout calories burned use Mifflin–St Jeor + a MET-based estimate that scales with your body weight and the session's total volume.
   - When a workout finishes, the session is logged in history and immediately reflected in the diet budget (no save button needed).

## Data flow at a glance

```
Profile (weight, sex, age…) ──► BMR ──► TDEE ──► Daily Target
                              ╲                       ▲
                               ╲                      │
Workout session ──► duration + volume ──► kcal burned ┤
                                                       ▼
Diet meals ──► consumed kcal ──► Energy Balance vs Target+Burned
```

The original projects (`Diet & Grocery Manager 2/` and `workout/`) are left untouched alongside this folder.
