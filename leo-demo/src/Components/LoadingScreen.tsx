import { projectImageUrl } from "../utils/images";

type LoadingScreenProps = {
  label?: string;
};

export default function LoadingScreen({ label = "Preparing your learning space" }: LoadingScreenProps) {
  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-[#f7f6fb] px-5 py-6 text-slate-900 sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-16 h-72 w-72 rounded-full border border-violet-200/60" />
        <div className="absolute -left-12 top-36 h-40 w-40 rounded-full border border-violet-200/50" />
        <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-violet-100/45 blur-3xl" />
        <div className="absolute bottom-10 right-[7%] h-28 w-28 rounded-full border border-violet-200/60" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col rounded-[2rem] border border-violet-100 bg-white/80 p-6 shadow-[0_24px_80px_-38px_rgba(76,29,149,0.36)] backdrop-blur-sm sm:p-10 lg:min-h-[min(760px,calc(100vh-5rem))] lg:p-12">
        <header className="flex items-center justify-between">
          <a href="/" className="text-sm font-extrabold tracking-[0.18em] text-violet-800" aria-label="Learn English Online home">
            LEO
          </a>
          <span className="rounded-full border border-violet-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">
            Please wait
          </span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:py-8">
          <div className="order-2 max-w-md lg:order-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Learn English Online</p>
            <h1 className="mt-4 max-w-sm text-4xl font-black leading-[1.04] tracking-[-0.055em] text-slate-900 sm:text-5xl">
              Putting your next lesson in place.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500 sm:text-base">
              We are getting everything ready so you can pick up exactly where you left off.
            </p>

            <div className="mt-8 flex items-center gap-4" role="status" aria-live="polite">
              <div className="loading-orbit" aria-hidden="true"><span /></div>
              <div>
                <p className="text-sm font-bold text-slate-700">{label}</p>
                <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-violet-100">
                  <div className="loading-progress h-full rounded-full bg-violet-700" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
            <div className="absolute inset-x-[8%] bottom-[7%] top-[8%] rounded-[2.25rem] bg-violet-100/70" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-violet-50/70 p-3 sm:p-5">
              <img
                src={projectImageUrl("girlHoldingWebpages.png")}
                alt="Illustration of a student surrounded by learning pages"
                className="loading-illustration relative aspect-square w-full object-contain"
              />
              <div className="absolute bottom-[15%] left-[8%] rounded-full border border-violet-100 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">One moment</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-violet-100 pt-5 text-[11px] font-medium text-slate-400">
          <span>Language learning for the real world.</span>
          <span>01 — 01</span>
        </footer>
      </div>
    </main>
  );
}
