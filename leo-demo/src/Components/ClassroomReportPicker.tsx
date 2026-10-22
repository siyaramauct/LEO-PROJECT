// -----------------------------------------------------------------------------
// Classroom Report Picker
//
// The list of classrooms on a Reports page: a card per classroom with its
// cover and name, each opening that classroom's report. It also shows the
// loading, error and empty states. A single column on phones, two columns on
// tablets, three on wide desktops.
//
// The page loads the classrooms and decides where a card leads.
//
// Used by: ClassProgress (teachers). Students go straight to their report
// (StudentLearningReport), which has its own classroom list.
// -----------------------------------------------------------------------------

import { ChevronRight } from "lucide-react";
import { bucketImageUrlOrBroken } from "../utils/images";

export type PickerClassroom = {
  classroom_id: string;
  classroom_name: string;
  cover_image_path: string | null;
};

type ClassroomReportPickerProps = {
  classrooms: PickerClassroom[];
  isLoading: boolean;
  error: string;
  emptyMessage: string;
  onSelect: (classroomId: string) => void;
};

const STATUS_BOX = "rounded-xl border bg-white p-8 text-center lg:p-10";

export default function ClassroomReportPicker({
  classrooms,
  isLoading,
  error,
  emptyMessage,
  onSelect,
}: ClassroomReportPickerProps) {
  if (isLoading) {
    return (
      <div className={`${STATUS_BOX} border-slate-100`}>
        <p className="text-sm text-slate-500">Loading classrooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${STATUS_BOX} border-red-100`}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <div className={`${STATUS_BOX} border-slate-100`}>
        <p className="text-sm font-semibold text-slate-700">No classrooms yet</p>
        <p className="mt-1 text-xs text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 hidden lg:block">
        <h2 className="font-bold">Your Classrooms</h2>
        <p className="mt-1 text-xs text-slate-500">Select a classroom to view its report.</p>
      </div>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom) => (
          <button
            key={classroom.classroom_id}
            type="button"
            onClick={() => onSelect(classroom.classroom_id)}
            className="flex w-full items-center rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-violet-200"
          >
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50">
              <img
                src={bucketImageUrlOrBroken(classroom.cover_image_path)}
                alt={`${classroom.classroom_name} classroom`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold">{classroom.classroom_name}</h3>
              <p className="mt-1 text-xs text-slate-500">View classroom report</p>
              <p className="mt-2 text-xs font-semibold text-violet-700">View Report</p>
            </div>
            <ChevronRight size={18} className="ml-2 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </section>
  );
}
