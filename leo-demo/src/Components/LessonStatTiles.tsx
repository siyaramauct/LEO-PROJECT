// -----------------------------------------------------------------------------
// Lesson Stat Tiles
//
// The statistics at the top of a lesson report, as plain tiles: a label, the
// figure, and one line of context so each number reads in terms of this class.
//   Quiz lessons            enrolled, completed the quiz, average, highest score
//   Flashcards-only lessons enrolled, finished the lesson, and a note that
//                           there is no quiz to score
//
// Two columns on phones, four from 640px.
//
// Used by: TeacherLessonReport
// -----------------------------------------------------------------------------

import { scoreBand, type ScoreBand } from "../domain/progress";
import type { LessonStudentResult } from "../services/reportService";

type LessonStatTilesProps = {
  results: LessonStudentResult[]; // One per enrolled student.
  isFlashcardsOnly: boolean;
  classroomName: string;
};

// The same band names as the classroom report.
const BAND_LABELS: Record<ScoreBand, string> = {
  mastered: "Mastered",
  developing: "Developing",
  support: "Needs support",
};

export default function LessonStatTiles({
  results,
  isFlashcardsOnly,
  classroomName,
}: LessonStatTilesProps) {
  // -- Figures --

  const enrolled = results.length;
  const done = results.filter((student) => student.attempted);
  const donePercent = enrolled ? Math.round((done.length / enrolled) * 100) : 0;

  const scored = done.filter(
    (student): student is LessonStudentResult & { scorePercent: number } =>
      student.scorePercent !== null,
  );
  const average = scored.length
    ? Math.round(scored.reduce((total, student) => total + student.scorePercent, 0) / scored.length)
    : null;
  const highest = scored.length ? Math.max(...scored.map((student) => student.scorePercent)) : null;
  const topStudents = scored.filter((student) => student.scorePercent === highest);

  // "Thabo Mokoena", or "Thabo Mokoena +2" when several share the top score.
  const topStudentsText =
    topStudents.length > 1
      ? `${topStudents[0].name} +${topStudents.length - 1}`
      : (topStudents[0]?.name ?? "");

  const classShare = enrolled ? `${donePercent}% of the class` : "No students yet";

  return (
    <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Enrolled students" value={String(enrolled)} detail={`in ${classroomName}`} />

      {isFlashcardsOnly ? (
        <>
          <StatTile
            label="Finished the lesson"
            value={`${done.length}/${enrolled}`}
            detail={classShare}
          />
          <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Flashcards only</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">
              This lesson has no quiz, so students aren't scored. Finishing the flashcards marks it
              as done.
            </p>
          </div>
        </>
      ) : (
        <>
          <StatTile
            label="Completed the quiz"
            value={`${done.length}/${enrolled}`}
            detail={classShare}
          />
          <StatTile
            label="Average score"
            value={average === null ? "—" : `${average}%`}
            detail={average === null ? "No quiz results yet" : BAND_LABELS[scoreBand(average)]}
          />
          <StatTile
            label="Highest score"
            value={highest === null ? "—" : `${highest}%`}
            detail={highest === null ? "No quiz results yet" : topStudentsText}
            detailTitle={topStudents.map((student) => student.name).join(", ")}
          />
        </>
      )}
    </section>
  );
}

// -- Small building blocks ----------------------------------------------------

type StatTileProps = {
  label: string;
  value: string;
  detail: string;
  detailTitle?: string; // The full text, when the detail may be cut short.
};

function StatTile({ label, value, detail, detailTitle }: StatTileProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500" title={detailTitle ?? detail}>
        {detail}
      </p>
    </div>
  );
}
