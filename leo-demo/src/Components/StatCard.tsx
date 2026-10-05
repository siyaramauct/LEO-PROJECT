import { cloneElement, type ReactElement } from "react";

type StatCardProps = {
  icon: ReactElement<{ size?: number }>;
  label: string;
  value: string;
  progress?: number;
  // Optional filled icon tile, e.g. "bg-sky-100 text-sky-700". Defaults to a plain violet icon.
  iconClassName?: string;
};

export default function StatCard({
  icon,
  label,
  value,
  progress,
  iconClassName,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className={`flex h-8 w-8 items-center justify-center ${iconClassName ? `rounded-lg ${iconClassName}` : "text-violet-700"}`}>
          {cloneElement(icon, { size: 19 })}
      </div>

      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>

      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-violet-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}