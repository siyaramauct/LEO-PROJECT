import { ChevronRight } from "lucide-react";

// Lesson summary data used by the classroom lesson catalogue.
type ClassroomLesson = {
  title: string;
  image: string;
  imageAlt: string;
  status: string;
  words: number;
  completion: number;
};

type ClassroomLessonRowProps = {
  lesson: ClassroomLesson;
};

export type { ClassroomLesson };

export default function ClassroomLessonRow({ lesson }: ClassroomLessonRowProps) {
  return (
    // The complete row acts as the future entry point to a lesson detail view.
    <button className="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left transition last:border-b-0 hover:bg-slate-50">
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        <img
          src={lesson.image}
          alt={lesson.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Lesson metadata keeps the status badge off compact mobile rows. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">{lesson.title}</p>
          <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
            {lesson.status}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {lesson.words} words · {lesson.completion}% completed
        </p>
      </div>

      <ChevronRight size={17} className="shrink-0 text-slate-400" />
    </button>
  );
}