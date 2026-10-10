import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ActivityCalendar from "../Components/ActivityCalendar";
import LoadingScreen from "../Components/LoadingScreen";
import ProgressBar from "../Components/ProgressBar";
import SegmentedControl from "../Components/SegmentedControl";
import TeacherShell from "../Components/TeacherShell";
import { useAuth } from "../../context/AuthContext";
import usePreloadImages from "../hooks/usePreloadImages";
import { ACTIVITY_WEEKS, buildActivityWeeks } from "../utils/activityCalendar";
import {
  FLAG_LABELS,
  INACTIVE_DAYS,
  MASTERY_PERCENT,
  SUPPORT_PERCENT,
  inactiveLabel,
  loadClassReports,
  scoreBand,
  type ClassReport,
  type LessonReport,
  type StudentReport,
} from "../utils/classReport";

type LessonSort = "order" | "hardest" | "easiest" | "completion";
type StudentSort = "attention" | "lowest" | "highest" | "inactive" | "name";

// Mastery bands share one scale everywhere on the page: dark violet is secure, dark slate needs reteaching.
const BAND_STYLES = {
  mastered: {
    bar: "bg-violet-700",
    cell: "bg-violet-700 text-white",
    label: `Mastered (${MASTERY_PERCENT}%+)`,
  },
  developing: {
    bar: "bg-violet-300",
    cell: "bg-violet-100 text-violet-900",
    label: `Developing (${SUPPORT_PERCENT}–${MASTERY_PERCENT - 1}%)`,
  },
  support: {
    bar: "bg-slate-700",
    cell: "bg-slate-700 text-white",
    label: `Needs support (<${SUPPORT_PERCENT}%)`,
  },
  notAttempted: { bar: "bg-slate-100", cell: "", label: "Not attempted" },
} as const;

const formatPercent = (value: number | null) => (value === null ? "—" : `${value}%`);

const lastActiveText = (student: StudentReport) =>
  student.daysSinceActive === null
    ? "Not in 12 weeks"
    : student.daysSinceActive === 0
      ? "Today"
      : student.daysSinceActive === 1
        ? "Yesterday"
        : `${student.daysSinceActive} days ago`;

// Nulls (nothing to compare yet) always sort last, whichever direction is chosen.
const compareNullable = (a: number | null, b: number | null, direction: 1 | -1) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : direction * (a - b);

function sortLessons(lessons: LessonReport[], sort: LessonSort) {
  const sorted = [...lessons];
  if (sort === "hardest")
    sorted.sort((a, b) => compareNullable(a.averagePercent, b.averagePercent, 1));
  if (sort === "easiest")
    sorted.sort((a, b) => compareNullable(a.averagePercent, b.averagePercent, -1));
  if (sort === "completion") sorted.sort((a, b) => a.completedCount - b.completedCount);
  return sorted;
}

function sortStudents(students: StudentReport[], sort: StudentSort) {
  const byName = (a: StudentReport, b: StudentReport) => a.name.localeCompare(b.name);
  return [...students].sort((a, b) => {
    if (sort === "attention")
      return (
        b.flags.length - a.flags.length ||
        compareNullable(a.averagePercent, b.averagePercent, 1) ||
        byName(a, b)
      );
    if (sort === "lowest")
      return compareNullable(a.averagePercent, b.averagePercent, 1) || byName(a, b);
    if (sort === "highest")
      return compareNullable(a.averagePercent, b.averagePercent, -1) || byName(a, b);
    if (sort === "inactive")
      return (b.daysSinceActive ?? Infinity) - (a.daysSinceActive ?? Infinity) || byName(a, b);
    return byName(a, b);
  });
}

function flagText(student: StudentReport) {
  return student.flags.map((flag) =>
    flag === "inactive" ? inactiveLabel(student.daysSinceActive) : FLAG_LABELS[flag],
  );
}

function KpiCard({
  label,
  value,
  detail,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold leading-none">{value}</p>
      {progress !== undefined && <ProgressBar value={progress} className="mt-3" />}
      <p className="mt-2 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

function MasteryBar({ lesson, total }: { lesson: LessonReport; total: number }) {
  const segments = (["mastered", "developing", "support", "notAttempted"] as const).filter(
    (band) => lesson.bands[band] > 0,
  );
  return (
    <div
      className="flex h-2 overflow-hidden rounded-full bg-slate-100"
      aria-label={segments
        .map((band) => `${lesson.bands[band]} ${BAND_STYLES[band].label}`)
        .join(", ")}
    >
      {total > 0 &&
        segments.map((band) => (
          <span
            key={band}
            className={BAND_STYLES[band].bar}
            style={{ width: `${(lesson.bands[band] / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

export default function ClassroomReport() {
  const { classroomId } = useParams();
  const { session } = useAuth();
  const teacherId = session?.user.id;

  const [activityWeeks] = useState(() => buildActivityWeeks(new Date()));
  const [report, setReport] = useState<ClassReport | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [lessonSort, setLessonSort] = useState<LessonSort>("order");
  const [studentSort, setStudentSort] = useState<StudentSort>("attention");

  useEffect(() => {
    if (!teacherId || !classroomId) return;
    let isCurrent = true;
    loadClassReports(teacherId, classroomId)
      .then((reports) => {
        if (isCurrent) setReport(reports[0] ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load the class report:", loadError);
        if (!isCurrent) return;
        setError("This class report could not be loaded right now.");
        setReport(null);
      });
    return () => {
      isCurrent = false;
    };
  }, [teacherId, classroomId]);

  const coverUrls = useMemo(
    () => (report === undefined ? null : report ? [report.coverUrl] : []),
    [report],
  );
  const imagesReady = usePreloadImages(coverUrls);

  if (report === undefined || !imagesReady) return <LoadingScreen label="Loading class report" />;

  const header = (
    <div className="mx-auto flex max-w-7xl items-center gap-3">
      <Link
        to="/class-progress"
        aria-label="Back to class reports"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
      >
        <ArrowLeft size={18} />
      </Link>
      <div className="min-w-0">
        <p className="text-xs font-medium text-violet-700">Class report</p>
        <h1 className="mt-1 truncate text-xl font-bold">{report?.name ?? "Classroom"}</h1>
      </div>
    </div>
  );

  if (!report) {
    return (
      <TeacherShell active="reports" header={header}>
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || "This classroom could not be found."}
          </p>
        </div>
      </TeacherShell>
    );
  }

  const enrolled = report.students.length;
  const quizLessons = report.lessons.filter((lesson) => lesson.hasQuiz);
  const attentionStudents = sortStudents(
    report.students.filter((student) => student.flags.length > 0),
    "attention",
  );
  const sortedLessons = sortLessons(report.lessons, lessonSort);
  const sortedStudents = sortStudents(report.students, studentSort);
  const hasScores = report.averagePercent !== null;
  const totalCompletions = report.students.reduce(
    (total, student) => total + student.completedCount,
    0,
  );

  const activityLevel = (dayKey: string) => {
    const active = report.activeStudentsByDay.get(dayKey) ?? 0;
    if (!active || !enrolled) return 0;
    const share = active / enrolled;
    return share <= 1 / 3 ? 1 : share <= 2 / 3 ? 2 : 3;
  };
  const activeDaysInWindow = activityWeeks
    .flat()
    .filter((day) => report.activeStudentsByDay.has(day.key)).length;

  return (
    <TeacherShell active="reports" header={header}>
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative min-h-28 overflow-hidden rounded-xl sm:col-span-2 xl:col-span-1">
            <img
              src={report.coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/50" />
            <div className="relative flex h-full flex-col justify-end p-4 text-white">
              <p className="text-lg font-bold leading-tight">
                {enrolled} student{enrolled === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-xs text-white/80">
                {report.lessons.length} released lesson{report.lessons.length === 1 ? "" : "s"} ·{" "}
                {quizLessons.length} with quizzes
              </p>
            </div>
          </div>
          <KpiCard
            label="Class average"
            value={formatPercent(report.averagePercent)}
            detail={
              report.masteryRate === null
                ? "No quiz scores yet"
                : `${report.masteryRate}% of results at mastery (${MASTERY_PERCENT}%+)`
            }
          />
          <KpiCard
            label="Lesson completion"
            value={formatPercent(report.completionRate)}
            progress={report.completionRate ?? 0}
            detail={`${totalCompletions} of ${enrolled * report.lessons.length} student-lessons done`}
          />
          <KpiCard
            label="Active in last 7 days"
            value={`${report.activeThisWeek} / ${enrolled}`}
            progress={enrolled ? (report.activeThisWeek / enrolled) * 100 : 0}
            detail="Studied on Leo at least once"
          />
          <KpiCard
            label="Need attention"
            value={String(report.needsAttention)}
            detail={report.needsAttention ? "See the list below" : "No students flagged"}
          />
        </section>

        <section className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold">Students to check in with</h2>
            <p className="mt-1 text-xs text-slate-500">
              Flagged for an average below {SUPPORT_PERCENT}%, no activity for {INACTIVE_DAYS}+
              days, or fewer than half of the released lessons done.
            </p>
            {enrolled === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No students have joined this classroom yet.
              </p>
            ) : attentionStudents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Everyone is active and on track.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {attentionStudents.map((student) => (
                  <li key={student.id} className="flex items-start gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {student.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{student.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {flagText(student).map((text) => (
                          <span
                            key={text}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {text}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">{formatPercent(student.averagePercent)}</p>
                      <p className="text-[11px] text-slate-400">
                        {student.completedCount}/{report.lessons.length} done
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold">Class activity</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Share of students who studied each day, last {ACTIVITY_WEEKS} weeks
                </p>
              </div>
              <p className="text-right">
                <span className="block text-lg font-bold leading-none">{activeDaysInWindow}</span>
                <span className="text-[11px] text-slate-400">
                  active day{activeDaysInWindow === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <div className="mt-5">
              <ActivityCalendar
                weeks={activityWeeks}
                getLevel={activityLevel}
                getTitle={(day) =>
                  `${day.date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} · ${report.activeStudentsByDay.get(day.key) ?? 0} of ${enrolled} students`
                }
                label={`Class activity over the last ${ACTIVITY_WEEKS} weeks`}
                legend={[
                  { level: 0, label: "None" },
                  { level: 1, label: "Up to a third" },
                  { level: 2, label: "Up to two thirds" },
                  { level: 3, label: "Most of the class" },
                ]}
              />
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Activity counts study anywhere on Leo, not only in this classroom.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Lessons</h2>
              <p className="mt-1 text-xs text-slate-500">
                Where the class is secure and which lessons to revisit. Scores use each student's
                best attempt.
              </p>
            </div>
            <SegmentedControl
              label="Sort lessons"
              value={lessonSort}
              onChange={setLessonSort}
              options={[
                { value: "order", label: "Course order" },
                { value: "hardest", label: "Hardest", disabled: !hasScores },
                { value: "easiest", label: "Easiest", disabled: !hasScores },
                { value: "completion", label: "Least completed" },
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            {(["mastered", "developing", "support", "notAttempted"] as const).map((band) => (
              <span key={band} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${BAND_STYLES[band].bar}`} />{" "}
                {BAND_STYLES[band].label}
              </span>
            ))}
          </div>

          {report.lessons.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No lessons have been released in this classroom yet.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-slate-100">
              {sortedLessons.map((lesson) => (
                <Link
                  key={lesson.lessonId}
                  to={`/teacher-classroom/${report.classroomId}/lesson/${lesson.lessonId}`}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 transition hover:bg-slate-50 sm:px-2 md:grid-cols-[3.5rem_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                >
                  <img src={lesson.imageUrl} alt="" className="h-11 w-14 rounded-lg object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {lesson.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {lesson.completedCount}/{enrolled} completed
                      {lesson.medianMinutes !== null && ` · ~${lesson.medianMinutes} min`}
                      {lesson.retakes > 0 &&
                        ` · ${lesson.retakes} retake${lesson.retakes === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <span className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto">
                    {lesson.hasQuiz ? (
                      <MasteryBar lesson={lesson} total={enrolled} />
                    ) : (
                      <span className="text-xs text-slate-400">Flashcards only · no quiz</span>
                    )}
                  </span>
                  <span className="col-start-3 row-start-1 w-20 text-right md:col-start-auto md:row-start-auto">
                    <span className="block text-sm font-bold">
                      {lesson.hasQuiz ? (
                        formatPercent(lesson.averagePercent)
                      ) : (
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      )}
                    </span>
                    {lesson.hasQuiz &&
                      lesson.firstAttemptAverage !== null &&
                      lesson.firstAttemptAverage !== lesson.averagePercent && (
                        <span className="block text-[11px] text-slate-400">
                          first try {lesson.firstAttemptAverage}%
                        </span>
                      )}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Gradebook</h2>
              <p className="mt-1 text-xs text-slate-500">
                Each student's best score per lesson. Scroll sideways for more lessons.
              </p>
            </div>
            <SegmentedControl
              label="Sort students"
              value={studentSort}
              onChange={setStudentSort}
              options={[
                { value: "attention", label: "Needs attention" },
                { value: "lowest", label: "Lowest avg", disabled: !hasScores },
                { value: "highest", label: "Highest avg", disabled: !hasScores },
                { value: "inactive", label: "Least active" },
                { value: "name", label: "Name" },
              ]}
            />
          </div>

          {enrolled === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Students will appear here once they join this classroom.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-[1] min-w-44 bg-slate-50 px-3 py-2 font-semibold"
                    >
                      Student
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Avg
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Done
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                      Last active
                    </th>
                    {report.lessons.map((lesson) => (
                      <th
                        key={lesson.lessonId}
                        scope="col"
                        title={lesson.title}
                        className="max-w-24 px-2 py-2 font-semibold"
                      >
                        <span className="block w-20 truncate">{lesson.title}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStudents.map((student) => (
                    <tr key={student.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] min-w-44 bg-white px-3 py-2 font-normal"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {student.name}
                        </span>
                        {student.flags.length > 0 && (
                          <span className="block truncate text-[11px] text-slate-500">
                            {flagText(student).join(" · ")}
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-2 text-right text-sm font-bold">
                        {formatPercent(student.averagePercent)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600">
                        {student.completedCount}/{report.lessons.length}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {lastActiveText(student)}
                      </td>
                      {report.lessons.map((lesson) => {
                        const result = student.results.get(lesson.lessonId);
                        const band =
                          result?.bestPercent != null ? scoreBand(result.bestPercent) : null;
                        return (
                          <td key={lesson.lessonId} className="px-2 py-2">
                            {band && result ? (
                              <span
                                title={
                                  result.attempts > 1
                                    ? `${result.attempts} attempts · first try ${result.firstPercent ?? "—"}%`
                                    : "1 attempt"
                                }
                                className={`flex h-7 w-14 items-center justify-center rounded-md text-[11px] font-semibold ${BAND_STYLES[band].cell}`}
                              >
                                {result.bestPercent}%
                              </span>
                            ) : result ? (
                              <span
                                title="Completed, no quiz"
                                className="flex h-7 w-14 items-center justify-center rounded-md bg-slate-50 text-slate-500"
                              >
                                <Check size={14} />
                              </span>
                            ) : (
                              <span
                                title="Not attempted"
                                className="flex h-7 w-14 items-center justify-center text-slate-300"
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </TeacherShell>
  );
}
