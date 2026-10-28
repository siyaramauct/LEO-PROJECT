// -----------------------------------------------------------------------------
// Score Colours
//
// The traffic-light colours for quiz scores on every report, so a grade reads
// the same wherever it appears. The bands come from domain/progress.ts:
//
//   green    mastered        80% and up
//   yellow   developing      50% to 79%
//   red      needs support   under 50%
//
// Text uses darker shades than bars so the figures stay readable on white.
//
// Used by: ClassroomReport || StudentLearningReport || TeacherLessonReport ||
//          LessonStatTiles
// -----------------------------------------------------------------------------

import { scoreBand, type ScoreBand } from "../domain/progress";

export const BAND_COLOURS: Record<ScoreBand, { text: string; bar: string }> = {
  mastered: { text: "text-green-700", bar: "bg-green-500" },
  developing: { text: "text-yellow-700", bar: "bg-yellow-400" },
  support: { text: "text-red-600", bar: "bg-red-500" },
};

// The text colour for a score; no score keeps the normal text colour.
export function scoreTextColour(percent: number | null): string {
  if (percent === null) {
    return "text-slate-900";
  }

  return BAND_COLOURS[scoreBand(percent)].text;
}

// The bar colour for a score's progress bar.
export function scoreBarColour(percent: number): string {
  return BAND_COLOURS[scoreBand(percent)].bar;
}
