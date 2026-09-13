import { Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateClassroomHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-violet-700 p-6 text-center text-white sm:p-10">
      <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute right-1/4 top-6 h-8 w-8 rotate-12 rounded-lg border-2 border-white/20" />
      <div className="absolute left-1/4 bottom-6 h-6 w-6 rotate-45 rounded-md border-2 border-white/20" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
          <Sparkles size={13} />
          Learning Hub
        </span>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Create your next classroom</h1>
        <p className="text-sm text-white/90 sm:text-base">
          Set up a name, level and cover in a couple of minutes, then invite your learners.
          Get inspired below, then bring it to life.
        </p>
        <Link to="/create-classroom" className="mt-1 flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50">
          <Plus size={19} />
          Create a classroom
        </Link>
      </div>
    </section>
  );
}
