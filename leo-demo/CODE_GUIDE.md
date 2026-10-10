# Leo Code Guide

How the Leo codebase is laid out, how the main features work, and the conventions to follow when changing it.

Leo is a vocabulary app for English learners. **Teachers** create classrooms and lessons (flashcards plus an AI-generated quiz). **Students** join classrooms with a code, study flashcards, take quizzes and track their progress. The frontend is React + TypeScript + Tailwind CSS, built with Vite. Supabase provides auth, the database, file storage and one edge function.

---

## Contents

1. [Getting started](#1-getting-started)
2. [Project map](#2-project-map)
3. [How a page is put together](#3-how-a-page-is-put-together)
4. [Routes and access](#4-routes-and-access)
5. [Auth context](#5-auth-context)
6. [Responsive layouts](#6-responsive-layouts)
7. [Popups](#7-popups)
8. [Search and sort](#8-search-and-sort)
9. [Calendars and release dates](#9-calendars-and-release-dates)
10. [The flashcard activity](#10-the-flashcard-activity)
11. [Creating a lesson with AI](#11-creating-a-lesson-with-ai)
12. [Notifications](#12-notifications)
13. [Images and storage](#13-images-and-storage)
14. [Code conventions](#14-code-conventions)
15. [Known loose ends](#15-known-loose-ends)

---

## 1. Getting started

```bash
npm install
npm run dev            # start the app at http://localhost:5173
npm run build          # type-check and build for production
npm run lint           # ESLint
npm run format         # format every file with Prettier
npm run format:check   # check formatting without changing anything
```

`.env` must define:

| Variable                        | What it is                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | The Supabase project URL                                                                                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The public (anon) key. It is safe to ship: row-level security in the database decides what each user can do. |

Database changes live in `supabase/migrations/` (newer) and `db/` (older). They are applied by hand in the Supabase SQL editor.

---

## 2. Project map

```
leo-demo/
  CODE_GUIDE.md         this file
  supabase/migrations/  SQL changes (policies, triggers, functions)
  db/                   older SQL (the student progress function)
  public/               static files served as they are
  src/
    main.tsx            app start-up and every route
    index.css           Tailwind import plus the loading and 404 animations
    supabase-client.ts  the one shared Supabase connection
    config/limits.ts    app-wide size limits (students, lessons, flashcards, image size)
    context/            AuthContext (who is signed in) and roles
    hooks/              usePreloadImages
    utils/              plain functions: dates, search, reports, images, notifications
    Components/         reusable pieces of UI
    Pages/              one file per screen, matched to a route in main.tsx
```

**Where to look first**

| You want to...                       | Open                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| See every screen and who can open it | `src/main.tsx`                                                                                     |
| Understand sign-in and roles         | `src/context/AuthContext.tsx`, `src/Components/GuardRoute.tsx`                                     |
| Change the student navigation        | `src/Components/StudentBottomNav.tsx`                                                              |
| Change the teacher navigation        | `src/Components/TeacherSidebar.tsx`, `src/Components/TeacherBottomNav.tsx`                         |
| Change how flashcards look or flip   | `src/Components/Flashcard.tsx`                                                                     |
| Change the study flow                | `src/Pages/FlashActivity.tsx`, `src/Pages/QuickQuiz.tsx`                                           |
| Change lesson creation               | `src/Pages/CreateLesson.tsx`                                                                       |
| Change the teacher's calendar        | `src/Components/LessonPlanner.tsx`                                                                 |
| Change progress reports              | `src/utils/classReport.ts`, `src/Pages/ClassroomReport.tsx`, `src/Pages/StudentLearningReport.tsx` |

Every file starts with a header comment that says what it is for, which route it serves and who uses it. Read the header before the code.

---

## 3. How a page is put together

Most pages follow the same five-part shape. Learn it once and every page reads the same way.

```tsx
export default function SomePage() {
  // 1. Who is signed in
  const { session } = useAuth();

  // 2. State: the data (null while loading), errors, and UI flags
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  // 3. Load data when the page opens
  useEffect(() => {
    if (!session?.user) return;
    let isCurrent = true; // ignore the result if the user has already left the page

    const load = async () => {
      const { data, error } = await supabase.from("table").select("columns");
      if (!isCurrent) return;
      if (error) setError("Friendly message.");
      else setItems(data);
    };

    void load();
    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

  // 4. Actions (save, delete), each updating state afterwards so no reload is needed

  // 5. Layout: a loading screen, an error screen, or the page
  if (items === null) return <LoadingScreen label="Loading..." />;
  return <main>...</main>;
}
```

Things to know:

- **Supabase is called directly from pages.** There is no API layer. Row-level security in the database limits what each query can return, so a student querying `lessons` only ever sees lessons from their own classrooms.
- **Related rows can come back in one query.** `.select("title, classrooms(classroom_name)")` follows a foreign key. The related row may arrive as an object or a one-item array, which is why pages check `Array.isArray(...)`.
- **Dashboards wait for images.** `usePreloadImages` keeps the loading screen up until every cover image has downloaded, so the page appears in one piece rather than flickering.
- **Mistakes are logged, not thrown at the user.** Failed queries go to `console.error` and the page shows a short, plain message.

---

## 4. Routes and access

All routes are in `src/main.tsx`, grouped by who may open them. `GuardRoute` wraps each protected group.

| Group    | Examples                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Anyone   | `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/select-role`                                    |
| Students | `/student/dashboard`, `/student/classrooms`, `/lesson/:lessonId`, `/quiz/:lessonId`, `/summary`, `/student/report` |
| Teachers | `/teacher-dashboard`, `/TeacherClassroom`, `/teacher-classroom/:classroomId`, `/create-lesson`, `/class-progress`  |
| Both     | `/learning-hub`                                                                                                    |

`/` (the `Home` page) shows nothing itself. It forwards each user to the right place: the login page, the role picker, or their dashboard.

---

## 5. Auth context

**File:** `src/context/AuthContext.tsx`. **Used through:** `useAuth()`.

### What it provides

| Value                                          | Meaning                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `session`                                      | The Supabase session, or `null` when signed out                      |
| `profile`                                      | The user's row from `profiles`: `id`, `name`, `surname`, `user_role` |
| `loading`                                      | `true` until the saved session has been checked on start-up          |
| `profileLoading`                               | `true` while the profile is being fetched                            |
| `profileError`                                 | A readable message if the profile could not be loaded                |
| `signup`, `login`, `loginWithGoogle`, `logout` | The auth actions                                                     |
| `refreshProfile()`                             | Re-reads the profile, for example after choosing a role              |

The **session** says who is signed in (Supabase Auth). The **profile** says what kind of user they are (`profiles.user_role`). Pages usually need both.

### What happens on start-up

1. `AuthContextProvider` wraps the whole app in `main.tsx`.
2. On mount it calls `supabase.auth.getSession()` to restore a session saved by an earlier visit, then loads that user's profile.
3. It subscribes to `supabase.auth.onAuthStateChange`, so sign-in, sign-out, token refreshes and returning from Google all update `session` straight away.
4. Whenever there is a session, the profile is loaded with `fetchOrCreateProfile`:
   - read the row from `profiles`
   - if there isn't one (a first-time Google user), create it from the name Google supplied
   - if that insert clashes with a row created at the same moment (error `23505`), read it again

> The profile load inside `onAuthStateChange` is wrapped in `setTimeout(..., 0)`. Supabase warns that awaiting other Supabase calls inside that callback can deadlock, so keep that wrapper.

### Signing in

| Method      | Flow                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email       | `LoginForm` calls `login()`; the profile loads; the user is sent to `/`, which forwards them on                                                      |
| Google      | `GoogleSignInButton` calls `loginWithGoogle()`; the browser leaves for Google and returns to `/`; the auth listener picks up the new session         |
| New account | `SignupForm` calls `signup()`. If Supabase returns a session, the user goes to `/select-role`; otherwise they are asked to confirm their email first |

New users have `user_role = null` until they pick Student or Teacher on `/select-role`. That page also generates their username, then calls `refreshProfile()` so the guards see the new role.

### Guarding pages

`GuardRoute` checks, in order (the first match wins):

```
still loading               -> loading screen
not signed in               -> /login
profile failed to load      -> /
profile not loaded yet      -> loading screen
no role yet                 -> /select-role
wrong role for this group   -> /
otherwise                   -> show the page
```

### Using it in a component

```tsx
const { session, profile, logout } = useAuth();
const userId = session?.user.id;
const isTeacher = profile?.user_role === "teacher";
```

`useAuth()` throws if it is used outside `AuthContextProvider`. In practice that can't happen, because the provider wraps everything.

---

## 6. Responsive layouts

### Breakpoints

Leo uses Tailwind's default breakpoints. Classes without a prefix apply to every width, and each prefix applies from its width upward.

| Name    | Width         | Tailwind prefix          | Navigation                            |
| ------- | ------------- | ------------------------ | ------------------------------------- |
| Phone   | under 768px   | (none), `sm:` from 640px | Bottom bar                            |
| Tablet  | 768 to 1023px | `md:`                    | Bottom bar (students get extra links) |
| Desktop | 1024px and up | `lg:`, `xl:` from 1280px | Violet sidebar                        |

**The rule:** the desktop design starts at `lg`. A fix for phones or tablets must only use base, `sm:` or `md:` classes, and must not change anything that applies at `lg` and above. If a `md:` class would also change desktop, restate the desktop value with `lg:`.

```tsx
// Phones: 2 columns. Tablets: 3. Desktop keeps its original 4.
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

### Student pages

`StudentBottomNav` draws all three layouts:

- **Phone:** a bottom bar with Home, Classrooms, a raised Practice button, Lessons and Profile.
- **Tablet:** the same bar at full width, with Report and Hub added (the items marked `tabletOnly`).
- **Desktop:** a fixed sidebar with every link and Log out.

Every student page leaves room for it on its `<main>` element:

```tsx
<main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
```

`pb-20` keeps content clear of the bottom bar; `lg:ml-56` moves content right of the 224px sidebar.

### Teacher pages

Teacher pages use one of two patterns.

**Pattern A: two layouts in one file.** Used where the phone and desktop designs genuinely differ (the dashboard, classrooms, classroom detail, create classroom, profile, learning hub).

```tsx
return (
  <div>
    {
      // -- Phone and tablet layout (under 1024px) --
    }
    <div className="... lg:hidden">
      ...
      <TeacherBottomNav active="classes" />
    </div>

    {
      // -- Desktop layout (1024px and up) --
    }
    <div className="hidden min-h-dvh lg:flex">
      <TeacherSidebar active="classes" />
      <main>...</main>
    </div>
  </div>
);
```

Both layouts are always in the page; CSS hides one. Keep any state they share (data, dialogs) in the page component, not inside one layout.

**Pattern B: `TeacherShell`.** Used where only the navigation changes (`ClassProgress`, `ClassroomReport`). Pass a header and the content, and the shell adds the sidebar or bottom bar:

```tsx
<TeacherShell active="reports" header={header}>
  <div className="mx-auto max-w-7xl p-4 sm:p-6">{content}</div>
</TeacherShell>
```

Use Pattern B for new teacher pages unless the phone design must be different.

### Patterns that keep things from breaking

- **Wide content scrolls sideways** inside `overflow-x-auto` (gradebook, roster table, activity calendars), instead of squashing.
- **Text truncates** with `truncate` or `line-clamp-2`, plus `min-w-0` on the flex child so truncation can work.
- **Buttons shrink to icons on phones:** `<span className="hidden sm:inline">Leave classroom</span>` next to an icon, with an `aria-label` on the button.
- **Stacks become rows:** `flex flex-col gap-3 sm:flex-row sm:items-center`.

---

## 7. Popups

There are four kinds of popup. All of them are plain React state plus Tailwind; there is no modal library.

### Confirmation dialog: `ConfirmDialog`

Used before anything destructive: deleting an account, classroom, lesson, scheduled lesson, flashcard or material, removing a student, or leaving a classroom.

**How it works:** the page keeps "what is about to be deleted" in state. Setting it opens the dialog; clearing it closes it.

```tsx
const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
const [isDeleting, setIsDeleting] = useState(false);

// Somewhere in the list
<button onClick={() => setLessonToDelete(lesson)}>Delete</button>

// Once, at the bottom of the page
<ConfirmDialog
  open={Boolean(lessonToDelete)}
  isDeleting={isDeleting}
  onCancel={() => setLessonToDelete(null)}
  onConfirm={() => void deleteLesson()}   // clears lessonToDelete when done
  title={`Delete ${lessonToDelete?.title}?`}
  description="This cannot be undone."
  confirmLabel="Delete lesson"
  deletingLabel="Deleting..."
/>
```

When open, the dialog renders a `fixed inset-0 z-50` dark overlay with a centred card. While `isDeleting` is true, both buttons are disabled so the action can't run twice. When `open` is false it renders nothing.

### Form dialog: `ChangePasswordDialog`

The same overlay idea, but the page decides whether to render it at all:

```tsx
{
  showPasswordDialog && <ChangePasswordDialog onClose={() => setShowPasswordDialog(false)} />;
}
```

It closes with its X button, its Done button, or the Escape key (an `onKeyDown` on the overlay).

### Dropdown: `NotificationBell`

1. The open or closed state lives in the component.
2. Opening it loads the newest 20 notifications.
3. A `mousedown` listener on `document` checks whether a click landed outside the bell's container (using a `ref`) and closes the dropdown if so.
4. The panel is `absolute right-0 z-30`, with `max-w-[calc(100vw-2rem)]` so it never runs off a phone screen.

### Popover: the invite panel on `ClassroomDetail` (desktop)

The "Invite students" button toggles `isInviteOpen`. While it is open, an effect adds two listeners: one for clicks outside the banner area and one for the Escape key. Either closes it. The listeners are removed when the popover closes.

### Making a new popup

- **Asking for confirmation?** Use `ConfirmDialog`.
- **A form or other content?** Copy `ChangePasswordDialog`'s outer `div`: `role="dialog"`, `aria-modal="true"`, `fixed inset-0 z-50 bg-slate-900/50 p-4`, a `max-w-md` card with `max-h-[90dvh] overflow-y-auto` so it fits on phones, and an Escape handler.
- **Attached to a button?** Copy the NotificationBell pattern: `relative` wrapper, `absolute` panel, and an outside-click listener.

Layer order: page content, then navigation bars (`z-20`), dropdowns (`z-30`), then dialogs (`z-50`).

---

## 8. Search and sort

**Files:** `src/utils/listControls.ts` (the logic) and `src/Components/SearchSortBar.tsx` (the controls).

### The search algorithm: `matchesSearch(query, ...fields)`

A word-by-word, case-insensitive "contains" search across several fields at once.

1. Split the query into lowercase words, dropping extra spaces: `"  Jo  SM "` becomes `["jo", "sm"]`.
2. An empty query matches everything.
3. Join the searchable fields into one lowercase string: `"john smith jsmith042"`.
4. The item matches only if **every** word appears **somewhere** in that string.

So `"jo sm"` finds John Smith, and so do `"smith john"` and `"042"`. Word order doesn't matter, and partial words count.

### Sorting helpers

| Helper                                          | Does                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `compareText(a, b)`                             | Alphabetical order that ignores case and accents and reads numbers as numbers ("Lesson 2" before "Lesson 10") |
| `compareNullableNumbers(a, b, "asc" or "desc")` | Numeric order where missing values always go last, whichever direction                                        |
| `toTime(date)`                                  | A date as a number for sorting, or `null` when missing                                                        |

Ties fall back to name order with `||`:

```ts
compareNullableNumbers(a.score, b.score, "desc") || compareText(a.name, b.name);
```

### Using it on a page

The page owns the state; `SearchSortBar` only draws the inputs.

```tsx
const [query, setQuery] = useState("");
const [sort, setSort] = useState<Sort>("name-asc");

const visible = items
  .filter((item) => matchesSearch(query, item.name, item.description))
  .sort(compareFor(sort));

<SearchSortBar
  query={query}
  onQueryChange={setQuery}
  searchPlaceholder="Search classrooms..."
  sort={sort}
  onSortChange={setSort}
  sortOptions={sortOptions}
/>;
```

Used by: `TeacherClassroom` (classrooms), `ClassroomStudentsTab` and `ClassroomInvitePanel` (students), and `StudentClassrooms` (search only). The reports use `SegmentedControl`, a row of toggle buttons, for their sort choices instead.

---

## 9. Calendars and release dates

Leo has three calendars. Two are activity heat maps; one is the teacher's planner.

### Dates as day keys

Calendars work with **day keys**: plain `"YYYY-MM-DD"` strings in the user's local time, made with `toDateKey(date)` in `utils/releaseDate.ts`.

- Keys compare correctly as strings: `"2026-10-09" < "2026-10-14"`.
- They match the database's `student_activity.activity_date` column, which is a plain date.
- They avoid time-zone surprises: a day picked on the calendar is always that day for the teacher.
- `daysBetween(fromKey, toKey)` counts whole days in UTC, so daylight-saving changes don't produce 23 or 25 hour "days".

### Activity heat maps (students and teachers)

**Component:** `ActivityCalendar`. **Grid builder:** `buildActivityWeeks(today)` in `utils/activityCalendar.ts`.

**The grid:** 12 columns (weeks), each running Monday to Sunday, with the current week last.

```
start = today
      - days since Monday   ((getDay() + 6) % 7, because getDay() counts Sunday as 0)
      - 11 weeks
then step forward one day at a time, 12 x 7 times
```

Days after today are flagged `isFuture` and drawn as dashed outlines.

**The colouring is decided by the page**, through two props:

| Page                    | `getLevel(dayKey)` returns                                | Meaning              |
| ----------------------- | --------------------------------------------------------- | -------------------- |
| `StudentLearningReport` | 3 if studied that day, else 0                             | One student's streak |
| `ClassroomReport`       | 0 to 3 by the share of the class active that day (thirds) | The whole class      |

**Where activity comes from.** A row is added to `student_activity` (one per student per day) when a student:

- opens a lesson's flashcards (`FlashActivity`, source `flashcard_practice`)
- finishes a flashcards-only lesson (`lesson_completed`)
- completes a quiz (`QuickQuiz`, `lesson_quiz`)

The insert uses `upsert(..., { ignoreDuplicates: true })`, so repeat visits on the same day are harmless. The streak and weekly goal figures come from the database function `get_student_progress` (`db/2026-08-28_student_progress.sql`).

### The teacher's lesson planner

**Component:** `LessonPlanner`. **Page:** `TeacherDashboard` (phone, tablet and desktop layouts).

1. Two rows of seven days: this week and next. Past days are disabled.
2. Days with scheduled lessons get a small dot.
3. Picking **today** makes the button say **Create lesson**. Picking a **later day** makes it say **Schedule lesson** and opens `/create-lesson?releaseDate=YYYY-MM-DD`.
4. Lessons scheduled for the picked day are listed underneath as `ScheduledLessonCard`s. Each one switches to an edit form in place (title, description, new date) or can be deleted, with confirmation.
5. Rescheduling a lesson moves the selection to its new day so it stays in view.

The dashboard loads the scheduled lessons (release date in the future) and saves edits; the planner only draws them and remembers the picked day.

### How release dates reach students

- `lessons.release_date` defaults to "now". A scheduled lesson is saved with midnight on the chosen day, in the teacher's time zone (`releaseDateToIso`).
- Every student query filters with `.lte("release_date", now)`, so scheduled lessons stay hidden until their day.
- Class reports also ignore unreleased lessons, so they don't count against completion.
- Students are notified about a new lesson only when it is released immediately. Scheduled lessons don't send a notification.

---

## 10. The flashcard activity

The study flow for one lesson is: **FlashActivity**, then optionally **ImageMatchActivity**, then **QuickQuiz**, then **LessonSummary**.

### FlashActivity (`/lesson/:lessonId`)

On opening, three queries run together: the flashcards, any PDFs attached to the lesson, and whether the lesson has a quiz. PDFs are in a private bucket, so each gets a signed link valid for an hour. Opening the page also logs today as an active day.

**How the cards move.** Only one card is on screen. `index` in state says which:

```tsx
const currentCard = flashcards[index];

<Flashcard key={currentCard.flashcard_id} ... />
```

- **Next** and **Previous** change `index`.
- The `key` is the important part. Because each card has a different key, React throws away the old `Flashcard` and mounts a fresh one. Every card therefore starts face up, with no translation selected, without any reset code.
- The progress bar width is `(index + 1) / total`.

**What the last card does:**

| Lesson          | Button        | Effect                                                                                                |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| Has a quiz      | Start quiz    | Opens `/quiz/:lessonId`                                                                               |
| Flashcards only | Finish lesson | Saves an attempt with `score: null` (so it counts as completed), logs activity, returns to classrooms |

Lessons with at least two image cards also show a **Match images** button.

### Flashcard: how the flip works

**File:** `src/Components/Flashcard.tsx`. The flip is pure CSS, driven by one `flipped` boolean.

```
outer div         the click target (role="button"; Space and Enter flip too)
  inner div       the layer that rotates
    front face    word, optional image, Read word button
    back face     definition, Read definition, language buttons, dictionary link
```

| Piece                  | Tailwind class                      | What it does                                                         |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Inner div              | `[transform-style:preserve-3d]`     | Keeps the two faces in 3D space instead of flattening them           |
| Inner div              | `transition-transform duration-500` | Animates the turn over half a second                                 |
| Inner div when flipped | `[transform:rotateY(180deg)]`       | Turns the card over                                                  |
| Both faces             | `absolute inset-0`                  | Stacks them exactly on top of each other                             |
| Both faces             | `[backface-visibility:hidden]`      | Hides a face while it points away from the viewer                    |
| Back face              | `[transform:rotateY(180deg)]`       | Starts it facing backwards, so it faces forwards once the card turns |

So at rest only the front is visible. Flipping rotates the whole stack by 180 degrees: the front turns away and hides, and the back turns to face the viewer.

Buttons on the card call `event.stopPropagation()`, so pressing them doesn't also flip the card.

**Read aloud** uses the browser's built-in speech: `speechSynthesis.cancel()` stops anything already playing, then `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`.

**Translation** (French, Russian, Spanish, Portuguese):

1. Clicking the active language switches back to English.
2. A language already translated during this visit is shown from state.
3. Otherwise, check the shared `flashcard_translations` table.
4. Otherwise, ask Gemini through the `gemini-API-Query` edge function, check the reply, and save it to the table for the next student.

### ImageMatchActivity (`/lesson/:lessonId/match`)

Words and images are shuffled separately (the Fisher-Yates shuffle in `shuffled()`), so the two columns don't line up. The student picks a word, then an image. A correct pair turns green and locks; a wrong one clears the selection with a hint. "Play again" bumps a `round` counter, which reshuffles both columns.

### QuickQuiz and LessonSummary

`QuickQuiz` shows one question at a time and keeps answers in a `{ questionId: "A" | "B" | "C" | "D" }` map, so students can go back and change them. On **Complete attempt** it:

1. scores the answers, scaled to the quiz's `score_ceiling`
2. saves a `lesson_attempts` row
3. notifies the teacher
4. logs today's activity
5. puts the detailed results in `sessionStorage` under `"quiz-result"` and opens `/summary`

`LessonSummary` reads that `sessionStorage` entry to show the score and the answer review.

---

## 11. Creating a lesson with AI

**File:** `src/Pages/CreateLesson.tsx`. It is a four-step form; nothing is saved until the last button.

| Step          | Collects                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Details    | Classroom, title, description, release date, PDFs, cover image. Checks the classroom isn't at its 50-lesson limit. |
| 2. Flashcards | Up to 15 term and definition pairs, with optional images                                                           |
| 3. Activity   | A quiz format, or the quiz switched off for a flashcards-only lesson                                               |
| 4. Review     | The generated quiz, fully editable, including which option is correct                                              |

**Generating the quiz:**

1. `buildMcqPrompt` turns the format and flashcards into a prompt that spells out the exact JSON to return.
2. The prompt goes to the `gemini-API-Query` edge function, which tries Gemini first and falls back to free OpenRouter models.
3. `parseGeneratedMcq` strips any code fence, parses the JSON, and requires a title plus exactly one complete question per flashcard.
4. If anything fails, `GenerationFailedNotice` appears, offering to try again or to save the lesson without a quiz.

**Saving** happens in order and stops at the first failure: the lesson, then the PDFs, then the flashcard images and rows, then the quiz and its questions, then a notification to students (only if the lesson is released now).

---

## 12. Notifications

- **Sending:** `utils/notifications.ts`. `notifyUser`, `notifyUsers` and `notifyClassroomStudents` insert rows into `notifications`. Sending is best effort: failures are logged and never block the action that triggered them.
- **Showing:** `NotificationBell` (see [Popups](#7-popups)). The unread badge stays live through a Supabase Realtime channel that listens for new rows addressed to the user. Each bell uses its own channel name, because a page can render two bells at once (its phone and desktop layouts).

---

## 13. Images and storage

| Bucket      | Holds                                                                                                                                     | Access                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `images`    | Classroom covers (`classroomImgs/`), lesson covers (`lessonImgs/`), artwork (`projectimgs/`), flashcard images (`flashcards/<lessonId>/`) | Public                               |
| `documents` | Classroom materials (`classroom_documents/<classroomId>/`) and lesson PDFs (`lesson_documents/<classroomId>/<lessonId>/`)                 | Private; opened through signed links |

Use the helpers in `utils/images.ts` rather than calling Supabase Storage directly:

| Helper                         | Use                                                        |
| ------------------------------ | ---------------------------------------------------------- |
| `bucketImageUrl(path)`         | URL for a stored image                                     |
| `bucketImageUrlOrBroken(path)` | The same, but shows the placeholder when the path is empty |
| `projectImageUrl(fileName)`    | Shorthand for `projectimgs/` artwork                       |

`installBrokenImageFallback()` (called once in `main.tsx`) swaps any image that fails to load for a placeholder, app-wide.

Uploaded files are named `<random id>-<original name>`, so two uploads with the same name never overwrite each other. Pages strip the id when they show the name.

---

## 14. Code conventions

### Formatting

Prettier formats everything (`.prettierrc.json`: 2 spaces, double quotes, semicolons, 100-character lines). Run `npm run format` before committing.

### Comments

Every file opens with a header, like the title and abstract of a report:

```ts
// -----------------------------------------------------------------------------
// Page Name
//
// What the page is for and what it does, in a few plain sentences.
//
// Route: /path || Access: teachers
// -----------------------------------------------------------------------------
```

Inside a file:

- **Dividers** label the main sections: `// -- Types ----...`, `// -- Page ----...`.
- **Smaller labels** mark steps inside a function or layout: `// -- Load the classroom --`.
- **Simple code** gets a one-line comment, or none.
- **Tricky logic** gets a short summary first, then numbered steps or line-by-line comments.
- Only `//` comments. JSX has no `//` syntax of its own, so labels inside markup use an empty expression:

  ```tsx
  {
    // -- Desktop layout (1024px and up) --
  }
  ```

  Avoid `/* */` and `{/* */}`.

### Naming and structure

- Components and pages use `PascalCase` file names matching the default export.
- Utility files use `camelCase`.
- Keep imports grouped: libraries first, then project components, context, hooks, the Supabase client, utils.
- Repeated Tailwind strings become a constant at the top of the file (`PRIMARY_BUTTON`, `inputClassName`).
- A piece of UI copied two or more times becomes a component (`ConfirmDialog`, `ProfileContent`, `AuthLayout`, `TeacherSidebar`).

### Adding a page

1. Create `src/Pages/MyPage.tsx` with the header comment.
2. Add the route to the right `GuardRoute` group in `src/main.tsx`.
3. Students: render `<StudentBottomNav />` and use `pb-20 lg:ml-56 lg:pb-0` on `<main>`. Teachers: use `TeacherShell`, or Pattern A from [Responsive layouts](#6-responsive-layouts).
4. Link to it from the navigation if needed.
5. Run `npm run format`, `npm run lint` and `npm run build`.

---

## 15. Known loose ends

These were found during the clean-up and deliberately left alone, because fixing them changes behaviour or needs a decision:

- **Missing image:** `stockPhotoHandCards.png` is not in the `images` bucket (`projectimgs/`), so the desktop login and signup panels show the broken-image placeholder. The file exists in `public/`; upload it to the bucket.
- **Unlinked routes:** `/student/flashcards` (a prototype with hard-coded sample cards), `/loading` and `/quiz` without a lesson id are reachable only by typing the address.
- **Teacher learning hub for students:** `/learning-hub` admits students but uses the teacher layout. Students have their own hub at `/student/hub`.
- **Image match then quiz:** "Continue to quiz" on the image match page always opens the quiz, even for flashcards-only lessons, which then show "Quiz unavailable".
- **Lesson summary fallback:** opened without a saved result, `LessonSummary` shows the latest score as an estimate out of 10.
- **Mobile roster:** removing a student and the per-student statistics are only on the desktop Students tab.
- **Teacher notifications from students:** "lesson completed" and "student left" are sent from the student's browser, which the current notification policy rejects. See `supabase/migrations/20261010_rls_hardening.sql`, which moves them into database triggers.
- **Account deletion:** the profile pages delete the `profiles` row only, and there is no database policy allowing that. A database function that deletes the auth user is needed.
