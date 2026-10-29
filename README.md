# 🩺 HealthTwin — Phase 1

**Personal health profile + health history + AI health companion.**

HealthTwin builds a living digital representation of your health from your history, reports, habits, symptoms and readings, so every question is answered in *your* context rather than as an isolated symptom.

> Don't build another symptom checker. Build a personal health context layer.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Click **Start** for the adaptive onboarding, or **Explore with a sample profile** to land on a fully populated HealthTwin (Arjun, 42, Bengaluru, with records from 2024–2026).

## The Phase 1 flow

| Step | Route | What it does |
|---|---|---|
| Welcome | `/` | Positioning, privacy promise, start or load sample |
| Smart onboarding | `/onboarding` | One question per screen; branches open only when answers call for them; inline safety notes |
| Health profile | `/profile` | Snapshot dashboard: counts, latest record, observed trends, cardiovascular / respiratory / tests / medications / family / lifestyle |
| Records vault | `/records`, `/records/[id]` | Year-grouped timeline, upload with simulated extraction, extracted-value table with change vs. previous report |
| Health trends | `/trends` | Line charts per metric with reference bands, hover tooltips and plain-language observations |
| HealthTwin AI | `/chat` | Context-aware companion with safety tiers, cited source records and follow-up prompts |
| Your data | `/profile/settings` | What is collected, what the AI sees (the exact prompt context), export, delete |

## Architecture

```
src/
  app/                      Next.js App Router (TypeScript, Tailwind v4)
    page.tsx                Welcome
    onboarding/             Adaptive survey
    (app)/                  Authenticated-style shell: profile, records, trends, chat, settings
    api/chat/route.ts       Companion endpoint (rebuilds context server-side, calls the provider)
  components/
    ui/                     Button, Badge, SafetyNote, Markdown, Logo
    shell/                  AppShell (sidebar + bottom nav), PageHeader, Container
    onboarding/             OnboardingFlow, QuestionInput (single / multi / number / text / scale / BP)
    records/                UploadDialog (uploaded → extracting → ready), icons
    trends/                 LineChart (hand-rolled SVG, no chart dependency)
  lib/
    types.ts                Domain model
    onboarding/
      schema.ts             Question + rule language (data, not code)
      questions.ts          The question tree (~70 questions, ~45 conditional)
      engine.ts             Rule evaluation, visibility, progress, pruning, safety alerts
      toProfile.ts          Answers → HealthProfile + self-reported readings
    context/engine.ts       Health Context Engine: build, render for prompt, retrieve by query
    ai/companion.ts         CompanionProvider seam + MockCompanion (intent → templated answer from context)
    trends.ts               Series, deltas, direction, observational text
    repository/             HealthRepository interface; ApiRepository (syncs with /api/state)
    server/                 db (Prisma), session (JWT cookie), auth actions, health-data access
    store/HealthStore.tsx   React context: answers, profile, records, readings, context
    mock/                   Sample records, readings and a completed onboarding
prisma/schema.prisma        Postgres model (User, HealthState, HealthRecord, Reading)
src/proxy.ts                Redirects signed-out visitors to /login
```

### Adaptive onboarding

The survey is data. Each question can declare a `showIf` rule (`is`, `includes`, `includesAny`, `gte`, `lte`, `all`, `any`…) evaluated against the answers so far. The engine computes the visible question list on every answer, prunes answers to questions that are no longer visible, and reports per-section progress. Follow-ups show *why* they're being asked. Safety-relevant answers (chest discomfort features, worst-ever headache, very high BP reading) surface an inline note before the user can continue.

Adding a branch means adding questions with rules in `questions.ts`. The UI never changes.

### Health Context Engine

`buildHealthContext(profile, records, readings)` assembles the layered picture: profile, conditions, medications, family, lifestyle, symptoms, records (newest first), flagged values, computed trends, BMI. `renderContextForPrompt` turns it into the system context a model will receive. `retrieveContext(ctx, query)` picks relevant sections and record ids, which the UI shows as "Based on" chips under each answer.

### Companion provider

`CompanionProvider.reply(messages, ctx) → CompanionReply { tier, content, sources, followUps }`. `MockCompanion` detects intent (summary, latest report, compare, doctor prep, medications, ECG, tiredness, BP, sugar, cholesterol, sleep, family risk, trends, urgent) and composes answers from the real context so the product is usable end-to-end. Replacing it with a Claude-backed provider is a single class with the same contract; the system prompt is `renderContextForPrompt(ctx)`.

### Safety layer

Three tiers everywhere: 🟢 information, 🟡 guidance (worth discussing with your doctor), 🔴 urgent (seek care). Trend text is observational ("your recorded systolic has decreased…"), never a conclusion.

### Data

Each user's twin lives in Postgres (Neon in production) through Prisma 7. Accounts use email + password (bcrypt), with a signed JWT session in an httpOnly cookie (`src/lib/server/session.ts`).

The UI still talks to `HealthRepository`. `ApiRepository` loads `GET /api/state` once and then sends only the changed fields with `PATCH /api/state`, debounced. `/api/chat` builds the health context on the server from the signed-in user's saved data. Data a browser stored before accounts existed is uploaded on first sign-in.

#### Setup

1. Create a Neon project and copy its connection string.
2. `cp .env.example .env`, then set `DATABASE_URL` and `SESSION_SECRET`.
3. `npm install` (runs `prisma generate`), then `npm run db:migrate` to create the tables.
4. `npm run dev`.

For a local database instead, run `npx prisma dev --name healthtwin --detach` and use the `postgres://` URL it prints.

On Vercel, add the same two variables to the project and run `npm run db:migrate` against the Neon database once per new migration.

## Next steps

1. Claude-backed `CompanionProvider` with streaming.
2. Real document extraction (PDF/image → `ExtractedValue[]`) behind the same `uploaded → extracting → ready` states.
3. HealthTwin Kit device readings (`Reading.source = "kit"`).
