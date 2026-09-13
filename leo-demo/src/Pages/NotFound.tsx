import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-[#f7f6fb] px-5 py-6 text-slate-900 sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute right-[7%] top-20 h-44 w-44 rounded-full border border-violet-200/60" />
        <div className="absolute bottom-[-7rem] left-[12%] h-72 w-72 rounded-full border border-violet-200/45" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col rounded-[2rem] border border-violet-100 bg-white p-6 sm:p-10 lg:min-h-[min(760px,calc(100vh-5rem))] lg:p-12">
        <header className="flex justify-end">
          <span className="text-xs font-bold uppercase tracking-[0.05em]  text-violet-500">Error 404</span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_0.98fr] lg:gap-14 lg:py-8">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-violet-600">Lost in translation</p>
            <h1 className="mt-4 text-6xl font-black leading-none tracking-[-0.075em] text-violet-800 sm:text-8xl">404</h1>
            <h2 className="mt-4 text-3xl font-black leading-[1.07] tracking-[-0.05em] sm:text-4xl">This page took a different route.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500 sm:text-base">
              We looked everywhere, but this lesson, page, or link is not here. Let us guide you back to familiar ground.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2"
            >
              Back to home
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-x-[5%] bottom-[5%] top-[11%] rotate-[-4deg] rounded-[2.5rem] border border-violet-100 bg-violet-50" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-3 sm:p-5">
              <img
                src="/girlMagnifyingGlass.png"
                alt="Illustration of a student searching with a magnifying glass"
                className="not-found-illustration aspect-square w-full object-contain"
              />
              <div className="absolute right-[8%] top-[14%] flex h-16 w-16 items-center justify-center rounded-full border border-violet-100 bg-white/90 text-[11px] font-black tracking-tight text-violet-700 shadow-sm sm:h-20 sm:w-20 sm:text-xs">
                <span className="text-center">not<br />here</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-violet-100 pt-5 text-[11px] font-medium text-slate-400">
          <span>Learn English Online</span>
          <span>Keep learning, keep exploring.</span>
        </footer>
      </div>
    </main>
  );
}
