import { BookOpen, ChevronRight, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Classroom {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  lessonCount: number;
  createdDate: string;
  // Raw creation time for sorting; null when the row has no date.
  createdTime: number | null;
  image: string;
  imageAlt: string;
  imageClassName: string;
}

type ClassroomMobileCardProps = {
  classroom: Classroom;
  onDelete: (classroom: Classroom) => void;
};

export default function ClassroomMobileCard({
  classroom,
  onDelete,
}: ClassroomMobileCardProps) {
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
      className="w-full cursor-pointer rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-violet-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-200"
    >
      <div className="flex items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 shadow-inner">
          <img
            src={classroom.image}
            alt={classroom.imageAlt}
            className={`h-full w-full ${classroom.imageClassName}`}
          />
        </div>

        <div className="ml-3 min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{classroom.name}</h3>
              <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">
                {classroom.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
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
                <Trash2 size={14} />
              </button>
              <ChevronRight size={17} className="ml-1 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users size={13} />
            <span className="text-[10px]">Students</span>
          </div>
          <p className="mt-1 text-xs font-bold">{classroom.studentCount}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <BookOpen size={13} />
            <span className="text-[10px]">Lessons</span>
          </div>
          <p className="mt-1 text-xs font-bold">{classroom.lessonCount}</p>
        </div>
        </div>

      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Invite students
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">
            Open classroom to share a code
          </p>
        </div>

        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </article>
  );
}
