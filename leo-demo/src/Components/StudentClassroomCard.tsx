import { BookOpen, Check, ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface StudentClassroomCardData {
  id: string;
  name: string;
  description: string;
  lessonCount: number;
  completedCount: number;
  image: string;
  imageAlt: string;
}

type StudentClassroomCardProps = {
  classroom: StudentClassroomCardData;
  onLeave: (classroom: StudentClassroomCardData) => void;
};

// Mirrors the teacher classroom card layout (thumbnail, stats grid, footer action)
// but swaps the delete action for a leave action, since students cannot manage a classroom.
export default function StudentClassroomCard({ classroom, onLeave }: StudentClassroomCardProps) {
  const navigate = useNavigate();

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/student/classrooms/${classroom.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/student/classrooms/${classroom.id}`);
        }
      }}
      className="w-full cursor-pointer rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-violet-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-200 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 shadow-inner">
          <img
            src={classroom.image}
            alt={classroom.imageAlt}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{classroom.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{classroom.description}</p>
            </div>

            {/* Students can leave a classroom, but never delete it. */}
            <button
              type="button"
              aria-label={`Leave ${classroom.name}`}
              title="Leave classroom"
              onClick={(event) => {
                event.stopPropagation();
                onLeave(classroom);
              }}
              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <BookOpen size={13} />
            <span className="text-[10px]">Lessons</span>
          </div>
          <p className="mt-1 text-sm font-bold">{classroom.lessonCount}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Check size={13} />
            <span className="text-[10px]">Completed</span>
          </div>
          <p className="mt-1 text-sm font-bold">{classroom.completedCount}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
          Open classroom <ChevronRight size={14} />
        </span>
      </div>
    </article>
  );
}
