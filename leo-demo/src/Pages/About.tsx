// -----------------------------------------------------------------------------
// About
//
// What LEO is, its aims and goals, and how teachers and students use it. The
// look follows the project's presentation slides: the whole page is the LEO
// violet, with white cards that sit on a lilac edge.
//
// The content is fixed in this file; nothing is loaded from the database. The
// card at the end of "How LEO is used" sends signed-out visitors to sign up
// and signed-in users back to "/", which forwards them to their dashboard.
//
// Route: /about || Access: anyone
// -----------------------------------------------------------------------------

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bucketImageUrl, projectImageUrl } from "../utils/images";

// -- Content ------------------------------------------------------------------

// Each aim: a short lead, then the sentence that explains it.
const AIMS = [
  {
    lead: "Vocabulary that lasts.",
    text: "Every new word is taught with a picture, an example sentence and repeated practice, so learners can recall it and use it outside the lesson.",
  },
  {
    lead: "Access on any device.",
    text: "LEO runs in the browser on phones, tablets and computers, and can be installed like an app, so practice fits into a learner's day.",
  },
  {
    lead: "Visibility for teachers.",
    text: "Quiz results are turned into class and lesson reports, so teachers can see who has mastered a lesson and who needs more support.",
  },
  {
    lead: "Steady motivation.",
    text: "Short activities, immediate feedback and study streaks reward regular practice rather than one-off effort.",
  },
];

const GOALS = [
  "Students build an everyday English vocabulary through short, regular lessons.",
  "Teachers create, schedule and manage their lessons in one place.",
  "Progress is reported clearly, using the same score bands for students and teachers.",
  "The interface stays simple enough for learners at any level to use on their own.",
  "Learners are pointed to trusted, free resources so practice continues beyond LEO.",
];

const TEACHER_STEPS = [
  "Create a classroom and share its invite code with students.",
  "Build vocabulary lessons from flashcards, images and an optional quiz.",
  "Release lessons immediately or schedule them for a later date.",
  "Follow results in the class, lesson and student reports.",
];

const STUDENT_STEPS = [
  "Join a classroom with the code from their teacher.",
  "Study each lesson's flashcards, with a translation when needed.",
  "Match words to pictures, then complete the lesson quiz.",
  "Track scores, completed lessons and their study streak.",
];

const ACTIVITIES = ["Flashcards", "Image matching", "Lesson quiz", "Translations", "Reports"];

// -- Page ---------------------------------------------------------------------

export default function About() {
  const { session } = useAuth();

  return (
    <main className="min-h-screen bg-violet-700 px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="LEO home">
            {/* A white tile, so the violet logo doesn't disappear into the page. */}
            <span className="rounded-xl bg-white p-1 shadow-[0_3px_0_0_#c4b5fd]">
              <img src={projectImageUrl("logo-mark.svg")} alt="" className="h-8 w-8" />
            </span>
            <span className="text-sm font-extrabold tracking-[0.14em]">LEO</span>
          </Link>
          <Link
            to={session ? "/" : "/login"}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-800 shadow-[0_3px_0_0_#c4b5fd] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-violet-700"
          >
            {session ? "Dashboard" : "Sign in"}
          </Link>
        </nav>

        {
          // Introduction, straight on the violet page like the slides
        }
        <header className="grid grid-cols-1 items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">About</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Learn English Online
            </h1>
            <p className="mt-2 text-xl font-bold text-fuchsia-200 sm:text-2xl">
              A vocabulary app for classrooms
            </p>
            <p className="mt-6 max-w-xl text-sm leading-7 text-violet-100 sm:text-base">
              LEO helps English learners build their vocabulary in lessons set by their own teacher.
              Teachers prepare short lessons of flashcards, images and quizzes; students work
              through them on any device; and the results feed reports that show both sides how
              learning is progressing.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5" aria-label="Activities in LEO">
              {ACTIVITIES.map((activity) => (
                <li
                  key={activity}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-[0_4px_0_0_#c4b5fd]"
                >
                  {activity}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[1.75rem] bg-white p-3 shadow-[0_6px_0_0_#c4b5fd] lg:max-w-md">
            <img
              src={bucketImageUrl("classroomImgs/classroomReportImgs/englishHoldingBack.webp")}
              alt="Illustration of hands holding an open English book, with letters floating around it"
              className="aspect-square w-full rounded-[1.25rem] object-cover"
            />
          </div>
        </header>

        {
          // About the platform
        }
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <SectionHeading>What LEO is</SectionHeading>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
              <p>
                LEO is a web application for teaching and practising English vocabulary. It is built
                around the classroom: a teacher creates a class, invites their students and releases
                lessons to them over the course of a term.
              </p>
              <p>
                Each lesson focuses on a small set of words. Students meet the words on flashcards,
                match them to pictures, and finish with a short quiz. Scores are saved after every
                attempt, so students can see their own progress and teachers can see the progress of
                the whole class.
              </p>
            </div>
          </Card>

          <Card>
            <SectionHeading>Our goals</SectionHeading>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {GOALS.map((goal) => (
                <li key={goal} className="flex gap-3">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600"
                    aria-hidden="true"
                  />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mt-6">
          <SectionHeading>Our aims</SectionHeading>
          <ol className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 text-sm leading-6 text-slate-600 md:grid-cols-2">
            {AIMS.map((aim, index) => (
              <li key={aim.lead} className="flex gap-4">
                <span className="w-5 shrink-0 font-black text-violet-700">{index + 1}.</span>
                <p>
                  <span className="font-bold text-slate-900">{aim.lead}</span> {aim.text}
                </p>
              </li>
            ))}
          </ol>
        </Card>

        {
          // How it is used
        }
        <section
          className="mt-12 border-t border-white/20 pt-10 sm:mt-14 sm:pt-12"
          aria-labelledby="how-leo-is-used"
        >
          <h2 id="how-leo-is-used" className="text-2xl font-black text-white sm:text-3xl">
            How LEO is used
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <StepCard title="Teachers" steps={TEACHER_STEPS} />
            <StepCard title="Students" steps={STUDENT_STEPS} />
          </div>

          {
            // Next step, across the full width under both lists
          }
          <Link
            to={session ? "/" : "/signup"}
            className="group mt-6 flex items-center gap-5 rounded-2xl bg-white p-5 shadow-[0_6px_0_0_#c4b5fd] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-violet-700 sm:p-6"
          >
            <img src={projectImageUrl("logo-mark.svg")} alt="" className="h-14 w-14 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black text-slate-900">
                {session ? "Back to your dashboard" : "Create an account"}
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {session ? "Continue where you left off." : "Free for students and teachers."}
              </span>
            </span>
            <ArrowRight
              size={20}
              className="shrink-0 text-violet-700 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </section>

        <footer className="mt-12 flex flex-col gap-1 border-t border-white/20 pt-5 text-xs text-violet-200 sm:flex-row sm:justify-between">
          <span>&copy; 2026 Learn English Online</span>
          <span>Language learning for the real world.</span>
        </footer>
      </div>
    </main>
  );
}

// -- Pieces -------------------------------------------------------------------

// A white card resting on a lilac edge, as on the slides.
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white p-6 text-slate-900 shadow-[0_6px_0_0_#c4b5fd] sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-black text-violet-800">{children}</h2>;
}

function StepCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_6px_0_0_#c4b5fd]">
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">{title}</h3>
      <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-6 text-slate-600 marker:font-bold marker:text-violet-700">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
