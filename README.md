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
    types.ts                Domain model, mirrors prisma/schema.prisma
    onboarding/
      schema.ts             Question + rule language (data, not code)
      questions.ts          The question tree (~70 questions, ~45 conditional)
      engine.ts             Rule evaluation, visibility, progress, pruning, safety alerts
      toProfile.ts          Answers → HealthProfile + self-reported readings
    context/engine.ts       Health Context Engine: build, render for prompt, retrieve by query
    ai/companion.ts         CompanionProvider seam + MockCompanion (intent → templated answer from context)
    trends.ts               Series, deltas, direction, observational text
    repository/             HealthRepository interface; LocalRepository (browser storage) today
    store/HealthStore.tsx   React context: answers, profile, records, readings, context
    mock/                   Sample records, readings and a completed onboarding
prisma/schema.prisma        Draft Postgres model (not yet installed or migrated)
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

Phase 1 stores everything in the browser (`LocalRepository`). The `/api/chat` route receives the context in the request body for now; with Prisma in place it will load it by user id. `prisma/schema.prisma` already mirrors `lib/types.ts`.

## Next steps

1. Claude-backed `CompanionProvider` with streaming.
2. Real document extraction (PDF/image → `ExtractedValue[]`) behind the same `uploaded → extracting → ready` states.
3. Prisma + Postgres repository, auth, and server-side context loading.
4. HealthTwin Kit device readings (`Reading.source = "kit"`).
