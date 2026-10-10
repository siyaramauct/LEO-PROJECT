// -----------------------------------------------------------------------------
// Teacher Dashboard
//
// The teacher's home screen. It brings together:
//   their newest classroom, highlighted at the top on phones
//   their three newest classrooms and three newest lessons
//   the lesson planner, a two-week calendar for creating and scheduling
//   lessons, and editing or deleting the ones already scheduled
//
// Phones and tablets (under 1024px) and desktop get two separate layouts built
// from the same data. The page stays on the loading screen until the data and
// cover images are ready.
//
// Route: /teacher-dashboard || Access: teachers
// -----------------------------------------------------------------------------

import { ChevronRight, LogOut, MoreHorizontal, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmDialog from "../Components/ConfirmDialog";
import LessonPlanner from "../Components/LessonPlanner";
import LoadingScreen from "../Components/LoadingScreen";
import NotificationBell from "../Components/NotificationBell";
import type { ScheduledLesson, ScheduledLessonEdits } from "../Components/ScheduledLessonCard";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";
import { useAuth } from "../context/AuthContext";
import usePreloadImages from "../hooks/usePreloadImages";
import { supabase } from "../supabase-client";
import { bucketImageUrlOrBroken } from "../utils/images";
import { releaseDateToIso, toDateKey } from "../utils/releaseDate";

// -- Types --------------------------------------------------------------------

type DashboardClassroom = {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  studentCount: number;
  lessonCount: number;
};

type DashboardLesson = {
  lesson_id: string;
  classroom_id: string;
  classroomName: string;
  title: string;
  description: string;
  lesson_image_path: string; // Full image URL.
  wordCount: number; // One flashcard is one word.
  created_at: Date;
  imageAlt: string;
};

// The dashboard previews the newest few; the full lists live on their own pages.
const DASHBOARD_ROW_LIMIT = 3;

// Counts rows per key: [{ id: "a" }, { id: "a" }, { id: "b" }] becomes { a: 2, b: 1 }.
function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return counts;
}

// -- Page ---------------------------------------------------------------------

export default function TeacherDashboard() {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Each list is null while loading and an empty array when there is nothing to show.
  const [classrooms, setClassrooms] = useState<DashboardClassroom[] | null>(null);
  const [classroomsError, setClassroomsError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<DashboardLesson[] | null>(null);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [scheduledLessons, setScheduledLessons] = useState<ScheduledLesson[] | null>(null);
  const [scheduledLessonsError, setScheduledLessonsError] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);
  const [scheduledLessonToDelete, setScheduledLessonToDelete] = useState<ScheduledLesson | null>(
    null,
  );
  const [isDeletingScheduledLesson, setIsDeletingScheduledLesson] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  // -- Load: classrooms with student and lesson counts --
  // The classrooms come newest first. The counts are worked out by fetching
  // the enrolment and lesson rows for those classrooms and tallying them.
  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      const { data, error } = await supabase
        .from("classrooms")
        .select("classroom_id, classroom_name, cover_image_path")
        .eq("teacher_id", session.user.id)
        .order("created_date", { ascending: false });

      if (error) {
        console.error("Failed to load the active classroom:", error);
        setClassroomsError("Your classrooms could not be loaded right now.");
        setClassrooms([]);
        return;
      }
      if (!data?.length) {
        setClassrooms([]);
        return;
      }

      const classroomIds = data.map((classroom) => classroom.classroom_id);
      const [
        { data: enrolments, error: enrolmentsError },
        { data: classLessons, error: lessonsError },
      ] = await Promise.all([
        supabase
          .from("classroom_students")
          .select("classroom_id, student_id")
          .in("classroom_id", classroomIds),
        supabase.from("lessons").select("lesson_id, classroom_id").in("classroom_id", classroomIds),
      ]);

      // Counts are a nice-to-have: on failure they show as zero.
      if (enrolmentsError) console.error("Failed to load classroom enrollments:", enrolmentsError);
      if (lessonsError) console.error("Failed to load lesson counts:", lessonsError);

      const studentCounts = countBy(enrolments ?? [], (row) => row.classroom_id);
      const lessonCounts = countBy(classLessons ?? [], (row) => row.classroom_id);

      setClassrooms(
        data.map((classroom) => ({
          id: classroom.classroom_id,
          name: classroom.classroom_name,
          image: bucketImageUrlOrBroken(classroom.cover_image_path),
          imageAlt: `${classroom.classroom_name} classroom cover`,
          studentCount: studentCounts[classroom.classroom_id] ?? 0,
          lessonCount: lessonCounts[classroom.classroom_id] ?? 0,
        })),
      );
    };

    void loadClassrooms();
  }, [session?.user]);

  // -- Load: newest lessons with word counts --
  // Lessons have no teacher column, so the teacher's classrooms are found first.
  useEffect(() => {
    if (!session?.user) return;

    const loadLessons = async () => {
      const { data: teacherClassrooms, error: classroomsError } = await supabase
        .from("classrooms")
        .select("classroom_id")
        .eq("teacher_id", session.user.id);

      if (classroomsError) {
        console.error("Failed to load classrooms for lessons:", classroomsError);
        setLessonsError("Your recent lessons could not be loaded right now.");
        return;
      }
      if (!teacherClassrooms?.length) {
        setLessons([]);
        return;
      }

      // classrooms(classroom_name) pulls in each lesson's classroom name in the
      // same query, through the classroom_id foreign key.
      const { data: recentLessons, error: lessonsError } = await supabase
        .from("lessons")
        .select(
          "lesson_id, classroom_id, title, description, lesson_image_path, created_at, classrooms(classroom_name)",
        )
        .in(
          "classroom_id",
          teacherClassrooms.map((classroom) => classroom.classroom_id),
        )
        // nullsFirst: false keeps undated lessons from jumping to the top.
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(DASHBOARD_ROW_LIMIT);

      if (lessonsError) {
        console.error("Failed to load the lessons:", lessonsError);
        setLessonsError("Your recent lessons could not be loaded right now.");
        return;
      }

      const { data: flashcards, error: flashcardsError } = await supabase
        .from("flashcards")
        .select("flashcard_id, lesson_id")
        .in(
          "lesson_id",
          recentLessons.map((lesson) => lesson.lesson_id),
        );
      if (flashcardsError)
        console.error("Failed to load flashcards for word count:", flashcardsError);
      const wordCounts = countBy(flashcards ?? [], (row) => row.lesson_id);

      setLessons(
        recentLessons.map((lesson) => {
          const classroom = Array.isArray(lesson.classrooms)
            ? lesson.classrooms[0]
            : lesson.classrooms;
          return {
            lesson_id: lesson.lesson_id,
            classroom_id: lesson.classroom_id,
            classroomName: classroom?.classroom_name ?? "Unknown classroom",
            title: lesson.title,
            description: lesson.description,
            lesson_image_path: bucketImageUrlOrBroken(lesson.lesson_image_path),
            wordCount: wordCounts[lesson.lesson_id] ?? 0,
            imageAlt: `${lesson.title} lesson cover`,
            created_at: lesson.created_at,
          };
        }),
      );
    };

    // Every exit path must end loading, or the page would stay on the loader.
    void loadLessons().finally(() => setIsLessonsLoading(false));
  }, [session?.user]);

  // -- Load: scheduled lessons for the planner --
  // The !inner join keeps only lessons in this teacher's classrooms.
  useEffect(() => {
    if (!session?.user) return;

    const loadScheduledLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "lesson_id, classroom_id, title, description, release_date, classrooms!inner(classroom_name, teacher_id)",
        )
        .eq("classrooms.teacher_id", session.user.id)
        .gt("release_date", new Date().toISOString())
        .order("release_date", { ascending: true });

      if (error) {
        console.error("Failed to load scheduled lessons:", error);
        setScheduledLessonsError("Scheduled lessons could not be loaded right now.");
        setScheduledLessons([]);
        return;
      }

      setScheduledLessons(
        data.map((lesson) => {
          const classroom = Array.isArray(lesson.classrooms)
            ? lesson.classrooms[0]
            : lesson.classrooms;
          return {
            lessonId: lesson.lesson_id,
            classroomId: lesson.classroom_id,
            classroomName: classroom?.classroom_name ?? "Unknown classroom",
            title: lesson.title,
            description: lesson.description ?? "",
            // Grouped by the teacher's local calendar day, matching how it was picked.
            releaseDateKey: toDateKey(new Date(lesson.release_date)),
          };
        }),
      );
    };

    void loadScheduledLessons();
  }, [session?.user]);

  // -- Planner actions --

  // Saves edits from a scheduled lesson card, then updates both lists in place.
  async function saveScheduledLesson(
    lesson: ScheduledLesson,
    edits: ScheduledLessonEdits,
  ): Promise<string | null> {
    const { error } = await supabase
      .from("lessons")
      .update({
        title: edits.title,
        description: edits.description,
        release_date: releaseDateToIso(edits.releaseDateKey),
      })
      .eq("lesson_id", lesson.lessonId);

    if (error) {
      console.error("Failed to update the scheduled lesson:", error);
      return "The lesson could not be updated. Please try again.";
    }

    setScheduledLessons((current) =>
      (current ?? [])
        .map((item) => (item.lessonId === lesson.lessonId ? { ...item, ...edits } : item))
        .sort((a, b) => a.releaseDateKey.localeCompare(b.releaseDateKey)),
    );
    setLessons(
      (current) =>
        current?.map((item) =>
          item.lesson_id === lesson.lessonId
            ? { ...item, title: edits.title, description: edits.description }
            : item,
        ) ?? null,
    );
    return null;
  }

  // Runs after the teacher confirms in the dialog.
  async function deleteScheduledLesson() {
    if (!scheduledLessonToDelete) return;
    const { lessonId, classroomId } = scheduledLessonToDelete;

    setIsDeletingScheduledLesson(true);
    setScheduledLessonsError(null);
    const { error } = await supabase.from("lessons").delete().eq("lesson_id", lessonId);
    setIsDeletingScheduledLesson(false);

    if (error) {
      console.error("Failed to delete the scheduled lesson:", error);
      setScheduledLessonsError("The lesson could not be deleted. Please try again.");
      setScheduledLessonToDelete(null);
      return;
    }

    // Remove it everywhere it appears and lower its classroom's lesson count.
    setScheduledLessons((current) => (current ?? []).filter((item) => item.lessonId !== lessonId));
    setLessons((current) => current?.filter((item) => item.lesson_id !== lessonId) ?? null);
    setClassrooms(
      (current) =>
        current?.map((item) =>
          item.id === classroomId
            ? { ...item, lessonCount: Math.max(0, item.lessonCount - 1) }
            : item,
        ) ?? null,
    );
    setScheduledLessonToDelete(null);
  }

  // -- Wait for images --

  const imageUrls = useMemo(
    () =>
      classrooms === null || isLessonsLoading
        ? null
        : [
            ...classrooms.map((classroom) => classroom.image),
            ...(lessons ?? []).map((lesson) => lesson.lesson_image_path),
          ],
    [classrooms, lessons, isLessonsLoading],
  );
  const imagesReady = usePreloadImages(imageUrls);

  if (classrooms === null || isLessonsLoading || scheduledLessons === null || !imagesReady) {
    return <LoadingScreen label="Loading your dashboard" />;
  }

  const newestClassroom = classrooms[0];

  // Both layouts render their own planner; only one is visible at a time.
  const planner = (
    <LessonPlanner
      scheduledLessons={scheduledLessons}
      error={scheduledLessonsError}
      onSaveLesson={saveScheduledLesson}
      onDeleteLesson={setScheduledLessonToDelete}
    />
  );

  // -- Phone and tablet layout (under 1024px) --
  // A single scrolling column, with the bottom navigation fixed underneath.

  const mobileLayout = (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-20 lg:hidden">
      <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4 sm:px-6">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight">Hi, {profile?.name} 👋</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Here's what's happening in your classrooms.
          </p>
        </div>
        <NotificationBell />
      </header>

      {
        // Newest classroom banner
      }
      <section className="mt-2 shrink-0 px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl bg-violet-700 p-3.5 text-white shadow-lg shadow-violet-200">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide">
                Active Classroom
              </span>
              <MoreHorizontal size={18} className="opacity-80" />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">
                  {newestClassroom?.name ?? "Create your first classroom"}
                </h2>
                <p className="mt-1 text-xs text-violet-100">
                  {newestClassroom
                    ? `${newestClassroom.studentCount} students · ${newestClassroom.lessonCount} lessons`
                    : "Set up a space for your learners and lessons"}
                </p>
              </div>

              {newestClassroom ? (
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                  <img
                    src={newestClassroom.image}
                    alt={newestClassroom.imageAlt}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-violet-600/50"
                >
                  <div className="absolute -right-4 -top-5 h-16 w-16 rounded-full border-[10px] border-violet-200/50" />
                  <div className="absolute -bottom-5 left-3 h-16 w-16 rotate-45 rounded-2xl bg-fuchsia-300/30" />
                  <div className="absolute bottom-4 right-4 h-3 w-10 -rotate-12 rounded-full bg-white/25" />
                </div>
              )}
            </div>

            <Link
              to={
                newestClassroom ? `/teacher-classroom/${newestClassroom.id}` : "/create-classroom"
              }
              className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              {newestClassroom ? "View Classroom" : "Create Classroom"}
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {
        // Quick actions
      }
      <section className="mt-3 shrink-0 px-4 sm:px-6">
        <h2 className="mb-3 text-sm font-bold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/create-lesson"
            className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-left transition hover:bg-violet-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-violet-700">
              <Plus size={20} />
            </div>
            <div>
              <p className="text-xs font-bold">Create Lesson</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Add vocabulary</p>
            </div>
          </Link>
          <Link
            to="/TeacherClassroom"
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition hover:bg-slate-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-violet-700">
              <Users size={19} />
            </div>
            <div>
              <p className="text-xs font-bold">Students</p>
              <p className="mt-0.5 text-[10px] text-slate-500">View your students</p>
            </div>
          </Link>
        </div>
      </section>

      {
        // Lesson planner, so phones and tablets can schedule lessons too
      }
      <section className="mt-3 shrink-0 px-4 sm:px-6">{planner}</section>

      {
        // My classes
      }
      <section className="mt-3 shrink-0 px-4 sm:px-6">
        <h2 className="mb-3 text-sm font-bold">My Classes</h2>
        {classroomsError ? (
          <p role="alert" className="text-xs text-red-700">
            {classroomsError}
          </p>
        ) : classrooms.length === 0 ? (
          <p className="text-xs text-slate-400">You haven't created any classrooms yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {classrooms.slice(0, DASHBOARD_ROW_LIMIT).map((item) => (
              <Link
                key={item.id}
                to={`/teacher-classroom/${item.id}`}
                className="flex h-32 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white text-center shadow-sm transition hover:border-violet-200"
              >
                <div className="min-h-0 w-full flex-1 overflow-hidden bg-slate-50">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-2 min-w-0 shrink-0 px-2 pb-2">
                  <p className="truncate text-[10px] font-bold">{item.name}</p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-500">
                    {item.studentCount} students · {item.lessonCount} lessons
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-3 px-4 pb-3 sm:px-6">
        <h2 className="mb-3 text-sm font-bold">Recent Lessons</h2>
        {lessonsError ? (
          <p role="alert" className="text-xs text-red-700">
            {lessonsError}
          </p>
        ) : lessons === null || lessons.length === 0 ? (
          <p className="text-xs text-slate-400">You haven't created any lessons yet.</p>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson) => (
              <Link
                key={lesson.lesson_id}
                to={`/teacher-classroom/${lesson.classroom_id}/lesson/${lesson.lesson_id}`}
                className="flex min-w-0 items-center rounded-xl border border-slate-100 bg-white p-2 text-left transition hover:border-violet-200"
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  <img
                    src={lesson.lesson_image_path}
                    alt={lesson.imageAlt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="ml-2 min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold">{lesson.title}</p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-500">
                    {lesson.classroomName} · {lesson.wordCount} words
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <TeacherBottomNav active="dashboard" />
    </div>
  );

  // -- Desktop layout (1024px and up) --
  // Sidebar on the left; classes and the planner side by side from xl, with
  // recent lessons underneath.

  const desktopLayout = (
    <div className="hidden min-h-dvh lg:flex">
      <TeacherSidebar active="dashboard" />

      <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage your classrooms and create engaging vocabulary lessons.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
            <NotificationBell />
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              aria-label={loggingOut ? "Logging out" : "Log out"}
              title="Log out"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={19} />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">
                {profile?.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.name}</p>
                <p className="text-xs text-slate-400">{profile?.user_role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-7xl flex-col gap-4 p-4 xl:p-6">
          <div className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] xl:items-stretch">
            {
              // My classes. self-start keeps its height when the planner grows.
            }
            <section className="self-start rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">My Classes</h3>
                  <p className="mt-1 text-xs text-slate-500">Manage your active classrooms.</p>
                </div>
                <Link
                  to="/create-classroom"
                  className="flex items-center gap-1 rounded-xl bg-violet-700 px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus size={15} />
                  Create Class
                </Link>
              </div>

              <div className="mt-2 space-y-1.5">
                {classroomsError ? (
                  <p role="alert" className="text-sm text-red-700">
                    {classroomsError}
                  </p>
                ) : classrooms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/60 px-4 py-6 text-center">
                    <Users className="mx-auto text-violet-700" size={22} />
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      Your first classroom starts here
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Create a classroom to organise lessons and invite learners.
                    </p>
                    <Link
                      to="/create-classroom"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"
                    >
                      <Plus size={15} /> Create Classroom
                    </Link>
                  </div>
                ) : (
                  classrooms.slice(0, DASHBOARD_ROW_LIMIT).map((item) => (
                    <Link
                      key={item.id}
                      to={`/teacher-classroom/${item.id}`}
                      className="flex items-center rounded-lg border border-slate-100 p-2"
                    >
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 p-1">
                        <img
                          src={item.image}
                          alt={item.imageAlt}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="ml-2 flex-1">
                        <h4 className="text-sm font-bold">{item.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.studentCount} students · {item.lessonCount} lessons
                        </p>
                      </div>
                      <span className="rounded-lg p-2 hover:bg-slate-50">
                        <ChevronRight size={17} />
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {planner}
          </div>

          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 bg-white p-3">
            <div>
              <h3 className="font-bold">Recent Lessons</h3>
              <p className="mt-1 text-xs text-slate-500">
                Lessons recently created for your classrooms.
              </p>
            </div>

            <div className="mt-2 space-y-1.5">
              {lessonsError ? (
                <p role="alert" className="text-xs text-red-700">
                  {lessonsError}
                </p>
              ) : lessons === null || lessons.length === 0 ? (
                <p className="text-xs text-slate-400">You haven't created any lessons yet.</p>
              ) : (
                lessons.map((lesson) => (
                  <Link
                    key={lesson.lesson_id}
                    to={`/teacher-classroom/${lesson.classroom_id}/lesson/${lesson.lesson_id}`}
                    className="flex items-center rounded-lg border border-slate-100 p-2"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      <img
                        src={lesson.lesson_image_path}
                        alt={lesson.imageAlt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="ml-2 min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold">{lesson.title}</h4>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {lesson.classroomName} · {lesson.wordCount} words
                      </p>
                    </div>
                    <span className="rounded-lg p-2 hover:bg-slate-50">
                      <ChevronRight size={17} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {mobileLayout}
      {desktopLayout}

      <ConfirmDialog
        open={Boolean(scheduledLessonToDelete)}
        isDeleting={isDeletingScheduledLesson}
        onCancel={() => setScheduledLessonToDelete(null)}
        onConfirm={() => void deleteScheduledLesson()}
        title={`Delete ${scheduledLessonToDelete?.title ?? "this lesson"}?`}
        description="This will permanently remove this scheduled lesson from the classroom. This action cannot be undone."
        confirmLabel="Delete lesson"
        deletingLabel="Deleting lesson..."
      />
    </div>
  );
}
