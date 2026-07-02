import { Link } from "react-router-dom";

const roles = [
  {
    title: "Student",
    description: "Practice lessons, build vocabulary, and track your progress through guided activities.",
    imageSrc: "/travel-illustration.avif",
    imageAlt: "Student learning from digital English lessons",
    href: "/signup?role=student",
    badge: "LEARN",
  },
  {
    title: "Teacher",
    description: "Organize learning paths, guide learners, and manage classroom-focused English practice.",
    imageSrc: "/businessEng.avif",
    imageAlt: "Teacher leading an online English learning session",
    href: "/signup?role=teacher",
    badge: "TEACH",
  },
];

export default function RoleSelection() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-5 py-10 sm:px-8 lg:h-screen lg:overflow-hidden lg:px-12 lg:py-10">

      <header className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.24em] text-violet-600">ACCOUNT SETUP</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          How will you use the platform?
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose the role that matches your goals. You can always update this later.
        </p>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-5xl flex-1 flex-col gap-5 sm:mt-10 sm:flex-row lg:mt-8 lg:min-h-0 lg:gap-6">
        {roles.map(({ title, description, imageSrc, imageAlt, href, badge }) => (
          <Link
            key={title}
            to={href}
            className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors duration-200 hover:border-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-52 lg:h-0 lg:flex-[1.4]">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="h-full w-full object-cover"
              />
              <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-slate-700">
                {badge}
              </span>
            </div>

            <div className="flex flex-col p-6 lg:flex-[0.6] lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              </div>

              <span className="mt-6 inline-flex items-center justify-center rounded-xl border border-violet-600 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                Continue as {title}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 sm:mt-10 lg:mt-6">
        &copy; 2026 Learn English Online
      </p>
    </div>
  );
}