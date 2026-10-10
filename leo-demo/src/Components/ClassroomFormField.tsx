// -----------------------------------------------------------------------------
// Classroom Form Field
//
// Wraps one input with its label, an optional hint and an optional error message,
// so every field in the classroom form looks the same.
//
// Used by: ClassroomForm
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";

type ClassroomFormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export default function ClassroomFormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: ClassroomFormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
