// -----------------------------------------------------------------------------
// Student Learning Hub
//
// A page of trusted, free English-learning websites (BBC, British Council,
// VOA, Cambridge). Each card opens the site in a new tab. The content is fixed
// in this file; nothing is loaded from the database.
//
// Route: /student/hub || Access: students
// -----------------------------------------------------------------------------

import { ArrowUpRight, BookOpen, Headphones, Library, Mic } from "lucide-react";
import StudentBottomNav from "../Components/StudentBottomNav";
import { projectImageUrl } from "../utils/images";

type Resource = {
  title: string;
  source: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  label: string;
  icon: typeof Headphones;
};

// -- Resources ----------------------------------------------------------------

const resources: Resource[] = [
  {
    title: "Listen to English used in the real world",
    source: "BBC Learning English",
    description:
      "Short videos, pronunciation practice and news-based lessons for a regular listening habit.",
    url: "https://www.bbc.co.uk/learningenglish/",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Learners studying together with a laptop",
    label: "Listening",
    icon: Headphones,
  },
  {
    title: "Find practice that matches your level",
    source: "British Council LearnEnglish",
    description:
      "Free reading, listening, grammar and vocabulary activities arranged by English level.",
    url: "https://learnenglish.britishcouncil.org/free-resources",
    image:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Open books on a study desk",
    label: "Practice",
    icon: BookOpen,
  },
  {
    title: "Learn through clear news and stories",
    source: "VOA Learning English",
    description:
      "Slow-paced news, video lessons and beginner courses that make everyday English easier to follow.",
    url: "https://learningenglish.voanews.com/",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Laptop and notebook prepared for an online lesson",
    label: "Watch",
    icon: Mic,
  },
  {
    title: "Look up words, hear them, use them",
    source: "Cambridge Learner’s Dictionary",
    description:
      "Clear definitions, examples and British and American audio pronunciations for everyday study.",
    url: "https://dictionary.cambridge.org/us/dictionary/learner-english/",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Handwriting notes in a notebook",
    label: "Vocabulary",
    icon: Library,
  },
];

// The three small labels under the banner heading.
const focusAreas = [
  { label: "Listen", icon: Headphones },
  { label: "Read", icon: BookOpen },
  { label: "Build words", icon: Library },
];

// -- Page ---------------------------------------------------------------------

export default function StudentLearningHub() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-[#faf9fc] pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-violet-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold tracking-[-0.025em]">Learning hub</h1>
              <p className="mt-1 text-xs text-slate-500">
                Free tools for practising beyond the classroom.
              </p>
            </div>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.1em] text-violet-600 sm:inline-flex">
              Free resources
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white px-5 py-7 sm:px-8 sm:py-9 lg:grid lg:min-h-[292px] lg:grid-cols-[1fr_0.78fr] lg:items-center lg:gap-8 lg:px-10">
            <div className="relative z-10 max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-violet-600">
                Resource library
              </p>
              <h2 className="mt-3 max-w-lg text-3xl font-black leading-[1.02] tracking-[-0.045em] text-slate-900 sm:text-[2.6rem]">
                Make room for English in your everyday life.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
                Trusted places to listen, read and build vocabulary whenever you have a few minutes.
              </p>
              <div className="mt-6 flex items-center gap-5 text-xs font-semibold text-slate-600">
                {focusAreas.map(({ label, icon: Icon }) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <Icon size={14} className="text-violet-700" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative mt-7 h-48 overflow-hidden rounded-xl bg-violet-50 sm:h-60 lg:mt-0 lg:h-64">
              <img
                src={projectImageUrl("artisticCollage.png")}
                alt="Collage of people collaborating on ideas"
                className="h-full w-full object-cover object-[50%_42%]"
              />
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-violet-600">
                  Choose a focus
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">Free study resources</h2>
              </div>
              <p className="hidden max-w-xs text-right text-xs leading-5 text-slate-500 sm:block">
                Choose one small thing to practise today. Consistency matters more than cramming.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[274px] flex-col overflow-hidden rounded-xl border border-violet-100 bg-white transition-colors hover:border-violet-300"
                  >
                    <div className="h-28 overflow-hidden bg-violet-50">
                      <img
                        src={resource.image}
                        alt={resource.imageAlt}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-violet-700">
                        <Icon size={12} />
                        {resource.label}
                      </div>
                      <p className="mt-3 text-[11px] font-semibold text-slate-400">
                        {resource.source}
                      </p>
                      <h3 className="mt-1.5 text-sm font-bold leading-snug tracking-[-0.015em] text-slate-900">
                        {resource.title}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {resource.description}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-bold text-violet-700">
                        Open resource <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          <section className="mt-6 border-y border-violet-100 py-4 sm:py-5">
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-bold tracking-[-0.01em] text-slate-900">One useful habit:</span>{" "}
              save a phrase from every resource you visit, then use it in your next lesson.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
