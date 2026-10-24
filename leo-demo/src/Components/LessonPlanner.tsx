// -----------------------------------------------------------------------------
// Lesson Planner
//
// The teacher's two-week calendar for creating and scheduling lessons.
//
// How it works:
//   1. Two rows of seven days are drawn: this week and next, Monday to Sunday.
//      Past days are disabled.
//   2. Days with scheduled lessons show a small dot underneath.
//   3. Picking today makes the button below say "Create lesson" (release now).
//      Picking a later day makes it "Schedule lesson" and passes that day to
//      the Create Lesson page as ?releaseDate=YYYY-MM-DD.
//   4. Lessons already scheduled for the picked day are listed underneath,
//      where they can be edited or deleted. Rescheduling a lesson moves the
//      selection to its new day so the change stays in view.
//
// Days are handled as "YYYY-MM-DD" keys in the teacher's local time (see
// utils/releaseDate.ts). The parent page loads and saves the lessons; this
// component only draws them and remembers which day is picked.
//
// Used by: TeacherDashboard (phone, tablet and desktop layouts)
// -----------------------------------------------------------------------------

import { Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey, toDateKey } from "../utils/releaseDate";
import ScheduledLessonCard, {
  type ScheduledLesson,
  type ScheduledLessonEdits,
} from "./ScheduledLessonCard";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type LessonPlannerProps = {
  scheduledLessons: ScheduledLesson[];
  error: string | null;
  // Saves edits; resolves to an error message, or null on success.
  onSaveLesson: (lesson: ScheduledLesson, edits: ScheduledLessonEdits) => Promise<string | null>;
  // Asks the parent to confirm and delete a lesson.
  onDeleteLesson: (lesson: ScheduledLesson) => void;
  // Lessons belong to a classroom; without one, the button leads to creating
  // a classroom instead of to a lesson form that couldn't be finished.
  hasClassrooms?: boolean;
};

// -- Calendar grid ------------------------------------------------------------

// Builds this week and next, each Monday to Sunday.
function buildPlannerWeeks(today: Date) {
  const todayKey = toDateKey(today);
  const mondayOffset = (today.getDay() + 6) % 7; // getDay() counts Sunday as 0.

  return ["This week", "Next week"].map((label, weekIndex) => ({
    label,
    days: WEEKDAY_LABELS.map((_, dayIndex) => {
      const date = new Date(today);
      date.setDate(today.getDate() - mondayOffset + weekIndex * 7 + dayIndex);
      const dateKey = toDateKey(date);
      return {
        dateKey,
        day: date.getDate(),
        isToday: dateKey === todayKey,
        isPast: dateKey < todayKey,
      };
    }),
  }));
}

// Today's month, e.g. "October 2026", even when the fortnight runs into the next month.
function plannerMonthLabel(today: Date) {
  return today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// -- Component ----------------------------------------------------------------

export default function LessonPlanner({
  scheduledLessons,
  error,
  onSaveLesson,
  onDeleteLesson,
  hasClassrooms = true,
}: LessonPlannerProps) {
  // The picked day. Today means "create now"; a later day means "schedule".
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const today = new Date();
  const todayKey = toDateKey(today);
  const plannerWeeks = buildPlannerWeeks(today);
  const monthLabel = plannerMonthLabel(today);

  // A page left open past midnight can hold a day that is now in the past;
  // treat that as today.
  const activeDateKey = selectedDateKey < todayKey ? todayKey : selectedDateKey;
  const isScheduling = selectedDateKey > todayKey;

  // How many lessons are scheduled on each day, for the dots.
  const scheduledCountByDay: Record<string, number> = {};
  for (const lesson of scheduledLessons) {
    scheduledCountByDay[lesson.releaseDateKey] =
      (scheduledCountByDay[lesson.releaseDateKey] ?? 0) + 1;
  }
  const selectedDayLessons = scheduledLessons.filter(
    (lesson) => lesson.releaseDateKey === activeDateKey,
  );

  // Save, then follow a rescheduled lesson to its new day.
  const saveLesson = async (lesson: ScheduledLesson, edits: ScheduledLessonEdits) => {
    const saveError = await onSaveLesson(lesson, edits);
    if (!saveError) setSelectedDateKey(edits.releaseDateKey);
    return saveError;
  };

  return (
    <section className="flex min-h-[17rem] flex-col rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-violet-700">Lesson planner</p>
          <h3 className="mt-1 text-lg font-bold">{monthLabel}</h3>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-violet-700">
          <Calendar size={20} />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {plannerWeeks.map((week) => (
          <div key={week.label}>
            <p className="mb-1.5 text-[11px] font-medium text-slate-400">{week.label}</p>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {week.days.map((day, dayIndex) => {
                const isSelected = day.dateKey === activeDateKey;
                const scheduledCount = scheduledCountByDay[day.dateKey] ?? 0;
                const dayLabel = day.isToday
                  ? `Create a lesson today, ${formatDateKey(day.dateKey)}`
                  : formatDateKey(day.dateKey);

                let dayStyle =
                  "border border-slate-100 bg-white text-slate-700 hover:border-slate-200";
                if (isSelected) dayStyle = "bg-violet-700 text-white";
                else if (day.isPast) {
                  dayStyle = "cursor-not-allowed border border-slate-100 bg-white text-slate-300";
                } else if (day.isToday) {
                  dayStyle =
                    "border border-slate-100 bg-white text-violet-700 hover:border-slate-200";
                }

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    disabled={day.isPast}
                    aria-pressed={day.isPast ? undefined : isSelected}
                    aria-label={
                      scheduledCount > 0
                        ? `${dayLabel}, ${scheduledCount} lesson${scheduledCount === 1 ? "" : "s"} scheduled`
                        : dayLabel
                    }
                    onClick={() => setSelectedDateKey(day.dateKey)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-1.5 pb-2 transition sm:p-2 sm:pb-2.5 ${dayStyle}`}
                  >
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-violet-100" : day.isPast ? "text-slate-300" : "text-slate-400"}`}
                    >
                      {WEEKDAY_LABELS[dayIndex]}
                    </span>
                    <span className="text-sm font-bold">{day.day}</span>
                    {scheduledCount > 0 && (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? "bg-white" : "bg-violet-700"}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {selectedDayLessons.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-700">
            Scheduled for {formatDateKey(activeDateKey)}
          </p>
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {selectedDayLessons.map((lesson) => (
              <ScheduledLessonCard
                key={lesson.lessonId}
                lesson={lesson}
                onSave={saveLesson}
                onDelete={onDeleteLesson}
              />
            ))}
          </div>
        </div>
      )}

      {isScheduling && (
        <p className="mt-4 text-xs text-slate-500">
          New lessons will release on {formatDateKey(activeDateKey)}.
        </p>
      )}

      <div className="mt-auto pt-5">
        {hasClassrooms ? (
          <Link
            to={isScheduling ? `/create-lesson?releaseDate=${activeDateKey}` : "/create-lesson"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
          >
            {isScheduling ? "Schedule lesson" : "Create lesson"}
            <ChevronRight size={17} />
          </Link>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Lessons belong to a classroom, so create your first classroom before adding lessons.
            </p>
            <Link
              to="/create-classroom"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
            >
              Create a classroom first
              <ChevronRight size={17} />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
