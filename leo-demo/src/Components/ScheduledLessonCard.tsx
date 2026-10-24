// -----------------------------------------------------------------------------
// Scheduled Lesson Card
//
// One upcoming lesson in the teacher dashboard's schedule. It shows the title,
// classroom and release day, and switches in place to an edit form for the
// title, description and release date. Saving and deleting are handled by the
// parent page.
//
// Used by: TeacherDashboard
// -----------------------------------------------------------------------------

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey, parseFutureDateKey, tomorrowDateKey } from "../utils/releaseDate";

type ScheduledLesson = {
  lessonId: string;
  classroomId: string;
  classroomName: string;
  title: string;
  description: string;
  releaseDateKey: string; // "YYYY-MM-DD" in the teacher's local time
};

type ScheduledLessonEdits = Pick<ScheduledLesson, "title" | "description" | "releaseDateKey">;

type ScheduledLessonCardProps = {
  lesson: ScheduledLesson;
  // The parent saves the edits and resolves to an error message, or null on success.
  onSave: (lesson: ScheduledLesson, edits: ScheduledLessonEdits) => Promise<string | null>;
  onDelete: (lesson: ScheduledLesson) => void;
};

export type { ScheduledLesson, ScheduledLessonEdits };

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-600";

export default function ScheduledLessonCard({
  lesson,
  onSave,
  onDelete,
}: ScheduledLessonCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [releaseDateKey, setReleaseDateKey] = useState(lesson.releaseDateKey);

  // Edit mode starts from the lesson's current values each time.
  function startEditing() {
    setTitle(lesson.title);
    setDescription(lesson.description);
    setReleaseDateKey(lesson.releaseDateKey);
    setError(null);
    setIsEditing(true);
  }

  async function saveChanges() {
    if (!title.trim()) {
      setError("Give the lesson a title.");
      return;
    }
    if (!releaseDateKey) {
      setError("Pick a release date from tomorrow onwards.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const saveError = await onSave(lesson, {
      title: title.trim(),
      description: description.trim(),
      releaseDateKey,
    });
    setIsSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }
    setIsEditing(false);
  }

  // -- Edit mode --

  if (isEditing) {
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Lesson title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={280}
              className={`${inputClassName} resize-none`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Release date</span>
            <input
              type="date"
              value={releaseDateKey}
              min={tomorrowDateKey()}
              onChange={(event) => setReleaseDateKey(parseFutureDateKey(event.target.value))}
              className={inputClassName}
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={isSaving}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    );
  }

  // -- View mode --

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/teacher-classroom/${lesson.classroomId}/lesson/${lesson.lessonId}`}
            className="block truncate text-sm font-semibold text-slate-800 hover:underline"
          >
            {lesson.title}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {lesson.classroomName} · Releases {formatDateKey(lesson.releaseDateKey)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit ${lesson.title}`}
            title="Edit"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(lesson)}
            aria-label={`Delete ${lesson.title}`}
            title="Delete"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {lesson.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{lesson.description}</p>
      )}
    </div>
  );
}
