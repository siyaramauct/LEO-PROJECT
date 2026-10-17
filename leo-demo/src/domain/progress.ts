// -----------------------------------------------------------------------------
// Progress Rules
//
// How the teacher reports judge progress: the score bands and the flags that
// mark a student as needing attention. Pure functions and constants, so the
// report and its explanations always use the same numbers.
// -----------------------------------------------------------------------------

// Mastery-learning practice (Bloom; Guskey) treats roughly 80% on a formative
// check as mastery.
export const MASTERY_PERCENT = 80;

// Below this, a lesson most likely needs reteaching rather than extra practice.
export const SUPPORT_PERCENT = 50;

// LMS activity is an early-warning signal (Macfadyen & Dawson, 2010); a week
// without study is worth a check-in.
export const INACTIVE_DAYS = 7;

// A student is "behind" once they have finished less than half of the lessons
// released so far.
const BEHIND_SHARE = 0.5;

export type ScoreBand = "mastered" | "developing" | "support";
export type StudentFlag = "low-scores" | "inactive" | "behind";

export function scoreBand(percent: number): ScoreBand {
  if (percent >= MASTERY_PERCENT) {
    return "mastered";
  }

  if (percent >= SUPPORT_PERCENT) {
    return "developing";
  }

  return "support";
}

type FlagInput = {
  averagePercent: number | null;
  daysSinceActive: number | null; // Null when there is no recent activity at all.
  completedLessons: number;
  releasedLessons: number;
};

// The "needs attention" badges for one student.
export function studentFlags({
  averagePercent,
  daysSinceActive,
  completedLessons,
  releasedLessons,
}: FlagInput): StudentFlag[] {
  const flags: StudentFlag[] = [];

  if (averagePercent !== null && averagePercent < SUPPORT_PERCENT) {
    flags.push("low-scores");
  }

  if (daysSinceActive === null || daysSinceActive >= INACTIVE_DAYS) {
    flags.push("inactive");
  }

  // With fewer than two lessons, being "behind" is not meaningful yet.
  if (releasedLessons >= 2 && completedLessons / releasedLessons < BEHIND_SHARE) {
    flags.push("behind");
  }

  return flags;
}

export const FLAG_LABELS: Record<StudentFlag, string> = {
  "low-scores": `Average below ${SUPPORT_PERCENT}%`,
  inactive: "Inactive",
  behind: "Behind on lessons",
};

export function inactiveLabel(daysSinceActive: number | null) {
  if (daysSinceActive === null) {
    return "No activity in 12 weeks";
  }

  return `Inactive ${daysSinceActive} days`;
}
