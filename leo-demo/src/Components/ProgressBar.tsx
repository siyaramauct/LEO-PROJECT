type ProgressBarProps = {
  value: number;
  className?: string;
};

export default function ProgressBar({ value, className = "" }: ProgressBarProps) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className="h-full rounded-full bg-violet-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
