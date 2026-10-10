import type { ActivityDay } from "../utils/activityCalendar";

// Shade per level: 0 = no activity, up to 3 = the busiest days.
const LEVEL_CLASSES = ["bg-slate-100", "bg-violet-200", "bg-violet-400", "bg-violet-700"];
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

type ActivityCalendarProps = {
  weeks: ActivityDay[][];
  getLevel: (dayKey: string) => number;
  getTitle: (day: ActivityDay) => string;
  label: string;
  legend: { level: number; label: string }[];
};

export default function ActivityCalendar({
  weeks,
  getLevel,
  getTitle,
  label,
  legend,
}: ActivityCalendarProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1.5" role="img" aria-label={label}>
          <div className="grid grid-rows-[auto_repeat(7,1rem)] gap-1 pr-1 text-[10px] leading-4 text-slate-400 sm:grid-rows-[auto_repeat(7,1.25rem)]">
            <span className="h-4" />
            {WEEKDAY_LABELS.map((weekday, index) => (
              <span key={index} className="flex items-center">
                {weekday}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => {
            const startsMonth =
              weekIndex === 0 ||
              week[0].date.getMonth() !== weeks[weekIndex - 1][0].date.getMonth();
            return (
              <div
                key={week[0].key}
                className="grid grid-rows-[auto_repeat(7,1rem)] gap-1 sm:grid-rows-[auto_repeat(7,1.25rem)]"
              >
                <span className="h-4 w-4 overflow-visible whitespace-nowrap text-[10px] leading-4 text-slate-400 sm:w-5">
                  {startsMonth ? week[0].date.toLocaleDateString("en-ZA", { month: "short" }) : ""}
                </span>
                {week.map((day) => (
                  <span
                    key={day.key}
                    title={day.isFuture ? undefined : getTitle(day)}
                    className={`h-4 w-4 rounded-[4px] sm:h-5 sm:w-5 ${day.isFuture ? "border border-dashed border-slate-200" : LEVEL_CLASSES[Math.min(3, Math.max(0, getLevel(day.key)))]}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {legend.map((item) => (
          <span key={item.level} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES[item.level]}`} /> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
