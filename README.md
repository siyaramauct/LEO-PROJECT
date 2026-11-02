# LEO: Learn English Online

LEO is a vocabulary app for English language classes. Teachers build short
lessons of flashcards and a multiple-choice quiz, and students practise them
until the words stick. Teachers can then see who is keeping up and who needs
help.

It was built as a UCT INF3003W capstone project.

## What it does

**Teachers**

- Create classrooms and invite students with a join code
- Build lessons: up to 15 flashcards, an optional quiz generated with AI, PDFs
  and a release date
- Share materials, and see progress reports for each classroom, lesson and
  student

**Students**

- Join classrooms and work through released lessons
- Study flashcards (with read-aloud and translation), play the image-match
  game and take the quiz
- Track their scores, weekly goal and study streak

LEO is a progressive web app, so it can be installed on a phone or desktop.

## Tech stack

| Area     | Choice                                                             |
| -------- | ------------------------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router           |
| Backend  | Supabase: PostgreSQL, Auth, Storage, Realtime, Edge Functions      |
| AI       | Gemini, called from a Supabase Edge Function (OpenRouter fallback) |
| Hosting  | Cloudflare, serving the built app as static files                  |
| Testing  | Vitest (unit and integration), Playwright (end-to-end and PWA)     |

## Architecture

LEO is a single-page React app with no server of its own. It talks directly to
Supabase, and the code is split into layers so that each one has a single job:

```
Pages / Components    what the user sees
        |
services/             multi-step actions, e.g. create a lesson, submit a quiz
        |
data/                 every Supabase query, one module per area
        |
Supabase              database, logins, file storage, AI edge function

domain/               plain rules (validation, scoring, limits) used by any layer
```

Pages call a service when an action takes several steps, and call `data/`
directly for simple reads. Only `data/` imports the Supabase client.

The choices behind this:

- **Security lives in the database.** Row-level security decides who can read
  or change each row, and database functions and triggers handle the sensitive
  steps, such as joining a classroom by code or checking a saved quiz score.
- **The AI key never reaches the browser.** Quiz generation and translation go
  through the `gemini-API-Query` edge function.
- **Business rules are plain functions.** Everything in `domain/` has no React
  or Supabase code, so it is easy to unit test.

## Navigating the code

The app is in `leo-demo/`. Every source file starts with a comment saying what
it does and, for pages, its route and who can open it.

| Path                          | What's there                                               |
| ----------------------------- | ---------------------------------------------------------- |
| `src/main.tsx`                | Every route, and which role can open it                    |
| `src/Pages/`                  | One file per screen                                        |
| `src/Components/`             | Shared UI: navigation, cards, dialogs, forms               |
| `src/services/`               | Multi-step actions for teachers and students               |
| `src/data/`                   | Supabase queries, grouped by table                         |
| `src/domain/`                 | Validation, quiz scoring, score bands, limits              |
| `src/utils/`                  | Small helpers: dates, images, speech, sorting              |
| `src/context/`                | Signed-in user and role                                    |
| `src/sw.ts`                   | Service worker for offline support                         |
| `supabase/migrations/`        | Database schema, security policies and functions           |
| `tests/`                      | `unit/`, `integration/`, `e2e/` and `pwa/` tests           |
| `public/`                     | Logos, PWA icons and the offline page                      |

A good place to start is a page in `src/Pages/`, then the service it calls.
For example, `CreateLesson.tsx` uses `services/lessonCreationService.ts`.

## Running it locally

You need Node 22 and a Supabase project.

```bash
cd leo-demo
npm install
cp .env.example .env    # add your Supabase URL and publishable key
npm run dev
```

The `gemini-API-Query` edge function is deployed in the Supabase project and
is not stored in this repository.

## Scripts

Run these from `leo-demo/`.

| Command                    | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `npm run dev`              | Start the dev server                                  |
| `npm run build`            | Type-check and build into `dist/`                     |
| `npm run lint`             | Run ESLint                                            |
| `npm run format`           | Format the code with Prettier                         |
| `npm test`                 | Unit tests                                            |
| `npm run test:integration` | Integration tests against a local Supabase            |
| `npm run test:e2e`         | End-to-end browser tests                              |
| `npm run test:pwa`         | Install and offline checks                            |

Integration tests need the local Supabase stack (`npx supabase start`) and a
`.env.test` file. `.env.test.example` explains what to put in it.

## Testing and deployment

GitHub Actions (`.github/workflows/tests.yml`) runs on every pull request and
push to `main`:

1. Formatting, lint, type-check, build, unit tests and PWA checks
2. Integration and end-to-end tests against a fresh local Supabase
3. On `main` only, once everything passes: build and deploy to Cloudflare

Cloudflare serves the built files in `dist/`, as set up in `wrangler.jsonc`.
Database changes go in `supabase/migrations/`.
