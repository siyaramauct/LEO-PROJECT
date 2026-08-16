import { BookOpen, ChevronRight, Copy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Classroom {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  lessonCount: number;
  joinCode: string;
  createdDate: string;
  image: string;
  imageAlt: string;
  imageClassName: string;
}

type ClassroomMobileCardProps = {
  classroom: Classroom;
};

export default function ClassroomMobileCard({
  classroom,
}: ClassroomMobileCardProps) {
  const navigate = useNavigate();

  const copyJoinCode = () => {
    navigator.clipboard.writeText(classroom.joinCode);
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/teacher-classroom/${classroom.id}`)}
      className="w-full rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
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
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{classroom.name}</h3>
              <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">
                {classroom.description}
              </p>
            </div>

            <ChevronRight size={17} className="ml-2 shrink-0 text-slate-300" />
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
            Join Code
          </p>
          <p className="mt-0.5 font-mono text-xs font-bold text-slate-700">
            {classroom.joinCode}
          </p>
        </div>

        <button
          type="button"
          aria-label={`Copy ${classroom.name} join code`}
          onClick={(event) => {
            event.stopPropagation();
            copyJoinCode();
          }}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <Copy size={14} />
        </button>
      </div>
    </button>
  );
}