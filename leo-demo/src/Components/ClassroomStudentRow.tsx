// Student data displayed in the classroom progress list.
type ClassroomStudent = {
  name: string;
  initials: string;
  image: string;
  progress: number;
  lastActive: string;
};

type ClassroomStudentRowProps = {
  student: ClassroomStudent;
};

export type { ClassroomStudent };

export default function ClassroomStudentRow({ student }: ClassroomStudentRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      {/* The image falls back to the student's initials if it cannot load. */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
        <img
          src={student.image}
          alt=""
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <span className="hidden">{student.initials}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{student.lastActive}</p>
      </div>

      {/* Progress stays compact on mobile and expands on wider screens. */}
      <div className="w-20 shrink-0 sm:w-28">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-slate-700">{student.progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-700"
            style={{ width: `${student.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
