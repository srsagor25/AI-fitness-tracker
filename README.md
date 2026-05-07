# AI Fitness Tracker

A unified diet + training tracker that merges the original **Diet & Grocery Manager** and **Workout Helper** apps into one connected React/Vite app.

## Stack

- React 18 + Vite
- Tailwind CSS 3
- lucide-react icons
- localStorage for app data (prefix `aift:`)
- Vercel serverless functions in `/api/` for AI calls (photo macros + eat-out suggestions)

## AI provider setup (Vercel)

Photo macros (`/api/analyze-photo`) and eat-out suggestions (`/api/suggest-eatout`) call an AI provider server-side, so the API key lives only in Vercel environment variables — never in the browser. Two providers are supported, set whichever you have:

| Variable | Provider | Notes |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | Default model `gpt-4o-mini`; override via `OPENAI_MODEL` |
| `GEMINI_API_KEY` | Google Gemini | Default model `gemini-2.0-flash` (free-tier compatible); override via `GEMINI_MODEL` |

If both are set, OpenAI wins. Add the variable in Vercel project → Settings → Environment Variables → redeploy.

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
