import { ChevronRight, Layers, Trash2 } from "lucide-react";

// Lesson summary data used by the classroom lesson catalogue.
type ClassroomLesson = {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
  status: string;
  words: number;
  completion: number;
  // False for flashcards-only lessons (no MCQ), which have no scores or completion.
  hasQuiz: boolean;
};

type ClassroomLessonRowProps = {
  lesson: ClassroomLesson;
  onDelete?: (lesson: ClassroomLesson) => void;
  onOpen?: (lesson: ClassroomLesson) => void;
};

export type { ClassroomLesson };

export default function ClassroomLessonRow({ lesson, onDelete, onOpen }: ClassroomLessonRowProps) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left transition last:border-b-0 hover:bg-slate-50">
      <button type="button" onClick={() => onOpen?.(lesson)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            {lesson.words} words ·{" "}
            {lesson.hasQuiz ? (
              `${lesson.completion}% completed`
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                <Layers size={10} /> Flashcards only · no scores
              </span>
            )}
          </p>
        </div>

        <ChevronRight size={17} className="shrink-0 text-slate-400" />
      </button>

      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${lesson.title}`}
          onClick={() => onDelete(lesson)}
          className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors duration-1000 ease-out hover:bg-violet-700 hover:text-white"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}