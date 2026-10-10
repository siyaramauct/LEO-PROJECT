import { BookOpen, ChevronRight, Trash2, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Classroom } from "./ClassroomMobileCard";

type ClassroomDesktopCardProps = {
  classroom: Classroom;
  onDelete: (classroom: Classroom) => void;
};

export default function ClassroomDesktopCard({ classroom, onDelete }: ClassroomDesktopCardProps) {
  const navigate = useNavigate();

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/teacher-classroom/${classroom.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/teacher-classroom/${classroom.id}`);
        }
      }}
      className="group cursor-pointer rounded-xl border border-slate-100 bg-white p-3 transition hover:border-violet-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-200"
    >
      <div className="flex items-start justify-between gap-3">
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
            <p className="mt-1 text-[11px] text-slate-400">Created {classroom.createdDate}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={`Delete ${classroom.name}`}
          title="Delete classroom"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(classroom);
          }}
          className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{classroom.description}</p>

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
            Invite students
          </p>
          <p className="mt-1 text-xs font-semibold text-violet-700">
            Open classroom to share a code
          </p>
        </div>

        <Link
          to={`/teacher-classroom/${classroom.id}`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition-all duration-1000 ease-out hover:bg-violet-700 hover:text-white"
        >
          View Classroom
          <ChevronRight size={14} />
        </Link>
      </div>
    </article>
  );
}
