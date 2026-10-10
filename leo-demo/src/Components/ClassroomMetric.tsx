// -----------------------------------------------------------------------------
// Classroom Metric
//
// A compact summary tile for classroom figures, with an icon, a value, a label
// and a short detail in the corner.
//
// Used by: ClassroomStudentsTab
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";

type ClassroomMetricProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};

export default function ClassroomMetric({ icon, label, value, detail }: ClassroomMetricProps) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <div className="flex items-center justify-between text-violet-700">
        <span className="flex h-8 w-8 items-center justify-center">{icon}</span>
        <span className="text-[10px] font-medium text-slate-400">{detail}</span>
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
