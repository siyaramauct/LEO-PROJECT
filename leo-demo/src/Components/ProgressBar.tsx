// -----------------------------------------------------------------------------
// Progress Bar
//
// A thin bar filled to a percentage. Values outside 0 to 100 are clamped.
// Violet by default; score bars pass a traffic-light colour (scoreColours).
//
// Used by: ClassroomReport || StudentLearningReport
// -----------------------------------------------------------------------------

type ProgressBarProps = {
  value: number;
  className?: string;
  barClassName?: string; // The fill colour.
};

export default function ProgressBar({
  value,
  className = "",
  barClassName = "bg-violet-700",
}: ProgressBarProps) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
