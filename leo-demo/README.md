# Leo

A vocabulary app for English learners. Teachers create classrooms and lessons (flashcards plus an AI-generated quiz); students join with a code, study, take quizzes and track their progress.

Built with React, TypeScript, Tailwind CSS and Vite, on Supabase (auth, database, storage and an edge function).

## Run it

```bash
npm install
npm run dev
```

Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` first.

| Command          | Does                                |
| ---------------- | ----------------------------------- |
| `npm run dev`    | Start the app locally               |
| `npm run build`  | Type-check and build for production |
| `npm run lint`   | Run ESLint                          |
| `npm run format` | Format every file with Prettier     |

## Find your way around

Read **[CODE_GUIDE.md](CODE_GUIDE.md)**. It covers the project layout, sign-in and roles, responsive layouts, popups, search, the calendars, the flashcard activity, AI lesson creation and the code conventions.
