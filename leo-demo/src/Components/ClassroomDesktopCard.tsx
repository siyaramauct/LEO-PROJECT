import { BookOpen, ChevronRight, MoreHorizontal, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Classroom } from "./ClassroomMobileCard";

type ClassroomDesktopCardProps = {
  classroom: Classroom;
};

export default function ClassroomDesktopCard({
  classroom,
}: ClassroomDesktopCardProps) {
  return (
    <div className="group rounded-xl border border-slate-100 bg-white p-3 transition hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 shadow-inner">
            <img
              src={classroom.image}
              alt={classroom.imageAlt}
              className={`h-full w-full ${classroom.imageClassName}`}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold">{classroom.name}</h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Created {classroom.createdDate}
            </p>
          </div>
        </div>

        <button
          aria-label={`More options for ${classroom.name}`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
        {classroom.description}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-slate-500">
            <Users size={15} />
            <span className="text-[10px]">Students</span>
          </div>
          <p className="mt-2 text-lg font-bold">{classroom.studentCount}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-slate-500">
            <BookOpen size={15} />
            <span className="text-[10px]">Lessons</span>
          </div>
          <p className="mt-2 text-lg font-bold">{classroom.lessonCount}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
            Classroom Join Code
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-violet-700">
            {classroom.joinCode}
          </p>
        </div>

        <Link to={`/teacher-classroom/${classroom.id}`} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition-all duration-1000 ease-out hover:bg-violet-700 hover:text-white">
          View Classroom
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}