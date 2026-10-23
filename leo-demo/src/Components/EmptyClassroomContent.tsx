// -----------------------------------------------------------------------------
// Empty Classroom Content
//
// Placeholders shown when a list has nothing in it yet: no lessons, no
// materials, or no classrooms.
//
// Used by: ClassroomDetail || TeacherClassroom
// -----------------------------------------------------------------------------

import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyLessons() {
  return (
    <div className="flex flex-col items-center px-4 py-7 text-center sm:py-8">
      <p className="text-sm font-semibold text-slate-800">No lessons yet</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        Use the create lesson button above to add the first lesson for this classroom.
      </p>
    </div>
  );
}

export function EmptyMaterials() {
  return (
    <p className="pb-4 pt-2 text-center text-xs text-slate-400">
      No materials yet. Upload a document or paste a link above.
    </p>
  );
}

export function EmptyClassrooms({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-5 py-9" : "px-6 py-14"}`}
    >
      <h3 className="text-sm font-bold text-slate-800">Start your first classroom</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        Create a dedicated space to organise lessons and invite your learners.
      </p>
      <Link
        to="/create-classroom"
        className="mt-4 flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-800"
      >
        <Plus size={16} />
        Create Classroom
      </Link>
    </div>
  );
}
