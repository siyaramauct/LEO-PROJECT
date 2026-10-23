// -----------------------------------------------------------------------------
// Student Dashboard
//
// The student's home screen. It shows:
//   a banner for their most recently joined classroom (or a prompt to join one)
//   a learning overview with this week's lessons and their streak
//   their two newest classrooms
//   the four newest lessons released to their classrooms
//
// The page stays on the loading screen until all data and cover images are
// ready, so it appears in one piece.
//
// Route: /student/dashboard || Access: students
// -----------------------------------------------------------------------------

import { ChevronRight, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import LoadingScreen from "../Components/LoadingScreen";
import { useAuth } from "../context/AuthContext";
import { type ClassroomSummary } from "../data/classrooms";
import { errorMessage } from "../data/errors";
import { getReleasedLessons } from "../data/lessons";
import { getProfileName, type ProfileName } from "../data/profiles";
import { getStudentProgress, type StudentProgress } from "../data/progress";
import usePreloadImages from "../hooks/usePreloadImages";
import { getEnrolledClassrooms } from "../services/classroomService";
import { bucketImageUrl } from "../utils/images";

// -- Types --------------------------------------------------------------------

type StudentProfile = ProfileName;

// cover_image_path is replaced with the full image URL once loaded.
type Classroom = ClassroomSummary;

// -- Settings -----------------------------------------------------------------

const DASHBOARD_CLASSROOM_LIMIT = 2;
const RECENTLY_ADDED_LIMIT = 4;

type RecentlyAddedLesson = {
  lesson_id: string;
  title: string;
  classroomName: string;
  lesson_image_path: string | null; // Full image URL.
};

// -- Page ---------------------------------------------------------------------

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(session?.user));
  const [studentClassroom, setStudentClassroom] = useState<Classroom | null>(null);
  // For both lists: null while loading, an empty array when there is nothing to show.
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [classroomError, setClassroomError] = useState<string | null>(null);
  const [recentlyAddedLessons, setRecentlyAddedLessons] = useState<RecentlyAddedLesson[] | null>(
    null,
  );
  const [recentlyAddedError, setRecentlyAddedError] = useState<string | null>(null);
  const fallbackName =
    session?.user.user_metadata?.name ?? session?.user.email?.split("@")[0] ?? "there";
  const studentName = studentProfile?.name ?? fallbackName;
  const studentInitial = studentName.charAt(0).toUpperCase();
  const weeklyPct = progress
    ? Math.min(
        100,
        Math.round((progress.weekly_lessons_completed / Math.max(progress.weekly_goal, 1)) * 100),
      )
    : 0;

  // -- Load: name and weekly progress --
  useEffect(() => {
    if (!session?.user) return;

    // Both are best effort: a failure falls back to the sign-in name and an
    // empty progress card.
    const loadProfile = async () => {
      const [profileName, studentProgress] = await Promise.all([
        getProfileName(session.user.id).catch((profileError) => {
          console.error("Could not load profile:", profileError);
          return null;
        }),
        getStudentProgress().catch((progressError) => {
          console.error("Could not load learning progress:", progressError);
          return null;
        }),
      ]);

      setStudentProfile(profileName);
      setProgress(studentProgress);
    };

    void loadProfile().finally(() => setIsProfileLoading(false));
  }, [session?.user]);

  // -- Load: newest classrooms --
  // The most recently joined classrooms, newest first (classroomService).
  useEffect(() => {
    if (!session?.user) return;

    let isCurrent = true; // Ignore results if the page has moved on.

    const loadClassroom = async () => {
      setClassroomError(null);

      try {
        const newestClassrooms = await getEnrolledClassrooms(session.user.id, {
          order: "newest",
          limit: DASHBOARD_CLASSROOM_LIMIT,
        });

        // Swap each cover's storage path for its full image URL.
        const classroomsWithCovers = newestClassrooms.map((classroom) => ({
          ...classroom,
          cover_image_path: classroom.cover_image_path
            ? bucketImageUrl(classroom.cover_image_path)
            : null,
        }));

        if (isCurrent) {
          setClassrooms(classroomsWithCovers);
          // The banner always shows the newest classroom.
          setStudentClassroom(classroomsWithCovers[0] ?? null);
        }
      } catch (loadError) {
        console.error("Failed to load classrooms:", loadError);

        if (isCurrent) {
          setClassroomError(
            errorMessage(loadError, "Your classrooms could not be loaded right now."),
          );
          setClassrooms([]);
        }
      }
    };

    void loadClassroom();
    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

  // -- Load: recently added lessons --
  useEffect(() => {
    if (!session?.user) return;

    let isCurrent = true;

    const loadRecentlyAdded = async () => {
      setRecentlyAddedError(null);

      try {
        // 1. The student's classrooms, for their names.
        const enrolledClassrooms = await getEnrolledClassrooms(session.user.id);
        const classroomNames = new Map(
          enrolledClassrooms.map((classroom) => [classroom.classroom_id, classroom.classroom_name]),
        );

        // 2. Their newest lessons. A scheduled lesson counts as "added" on its release date.
        const newestLessons = await getReleasedLessons([...classroomNames.keys()], {
          order: "newest",
          limit: RECENTLY_ADDED_LIMIT,
        });

        if (isCurrent) {
          setRecentlyAddedLessons(
            newestLessons.map((lesson) => ({
              lesson_id: lesson.lesson_id,
              title: lesson.title,
              classroomName: classroomNames.get(lesson.classroom_id) ?? "Classroom",
              lesson_image_path: lesson.lesson_image_path
                ? bucketImageUrl(lesson.lesson_image_path)
                : null,
            })),
          );
        }
      } catch (loadError) {
        console.error("Failed to load recently added lessons:", loadError);

        if (isCurrent) {
          setRecentlyAddedError("Recently added lessons could not be loaded right now.");
          setRecentlyAddedLessons([]);
        }
      }
    };

    void loadRecentlyAdded();
    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

  // -- Wait for images --
  // Collect every cover the page will show and preload them before revealing it.
  const imageUrls = useMemo(
    () =>
      classrooms === null || recentlyAddedLessons === null
        ? null
        : [
            ...classrooms.flatMap((classroom) =>
              classroom.cover_image_path ? [classroom.cover_image_path] : [],
            ),
            ...recentlyAddedLessons.flatMap((lesson) =>
              lesson.lesson_image_path ? [lesson.lesson_image_path] : [],
            ),
          ],
    [classrooms, recentlyAddedLessons],
  );
  const imagesReady = usePreloadImages(imageUrls);

  if (isProfileLoading || classrooms === null || recentlyAddedLessons === null || !imagesReady) {
    return <LoadingScreen label="Loading your dashboard" />;
  }

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold">
                Hi, {isProfileLoading ? "..." : studentName}
              </h1>
              <p className="mt-1 text-xs text-slate-500">Continue building your English skills.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <NotificationBell />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">
                  {studentInitial}
                </div>
                <div className="min-w-0">
                  <p className="max-w-28 truncate text-sm font-semibold text-slate-800">
                    {studentName}
                  </p>
                  <p className="text-xs text-slate-400">{profile?.user_role ?? "student"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white sm:p-6">
              {studentClassroom && (
                <>
                  <div className="absolute inset-y-0 right-0 w-40 bg-white/10 sm:w-52" />
                  <img
                    src={studentClassroom.cover_image_path ?? undefined}
                    alt="Student learning"
                    className="absolute inset-y-0 right-0 w-40 object-cover sm:w-52"
                  />
                </>
              )}
              {/* Text leaves room for the cover picture only when there is one. */}
              <div className={`relative max-w-md ${studentClassroom ? "pr-24 sm:pr-32" : ""}`}>
                {studentClassroom ? (
                  <>
                    <p className="text-xs font-medium text-violet-100">Continue learning</p>
                    <h2 className="mt-2 text-xl font-bold">{studentClassroom.classroom_name}</h2>
                    <p className="mt-2 text-sm text-violet-100">{studentClassroom.description}</p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/student/classrooms/${studentClassroom.classroom_id}`)
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      Open Classroom <ChevronRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-violet-100">Ready to learn?</p>
                    <h2 className="mt-2 text-xl font-bold">Join your first classroom</h2>
                    <p className="mt-2 text-sm text-violet-100">
                      Ask your teacher for an invitation, then open your classrooms to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/student/classrooms")}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      View Classrooms <Users size={16} />
                    </button>
                  </>
                )}
              </div>
            </article>
            <button
              type="button"
              onClick={() => navigate("/student/report")}
              className="rounded-xl border border-slate-100 bg-white p-5 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Learning overview</h2>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    {progress
                      ? `${progress.weekly_lessons_completed} / ${progress.weekly_goal}`
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Weekly lessons</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {progress
                      ? `${progress.current_streak} day${progress.current_streak === 1 ? "" : "s"}`
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Learning streak</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-700"
                  style={{ width: `${weeklyPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {weeklyPct}% of this week’s goal completed
              </p>
            </button>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <article className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold">My classrooms</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your most recently joined classrooms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/student/classrooms")}
                  className="shrink-0 whitespace-nowrap py-1 text-sm font-semibold text-violet-700"
                >
                  View all
                </button>
              </div>
              {classroomError ? (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {classroomError}
                </p>
              ) : classrooms.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  You have not been enrolled in a classroom yet.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {classrooms.map((classroom) => (
                    <button
                      key={classroom.classroom_id}
                      type="button"
                      onClick={() => navigate(`/student/classrooms/${classroom.classroom_id}`)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                    >
                      {classroom.cover_image_path ? (
                        <img
                          src={classroom.cover_image_path}
                          alt=""
                          className="h-11 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-11 w-14 shrink-0 rounded-lg bg-violet-50" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {classroom.classroom_name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {classroom.description ?? "Classroom"}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </article>
            <article className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold">Recently added</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Newest lessons added to your classrooms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/lessons")}
                  className="shrink-0 whitespace-nowrap py-1 text-sm font-semibold text-violet-700"
                >
                  View all
                </button>
              </div>
              {recentlyAddedError ? (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {recentlyAddedError}
                </p>
              ) : recentlyAddedLessons.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No lessons have been added to your classrooms yet.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {recentlyAddedLessons.map((lesson) => (
                    <button
                      key={lesson.lesson_id}
                      type="button"
                      onClick={() => navigate(`/lesson/${lesson.lesson_id}`)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                    >
                      {lesson.lesson_image_path ? (
                        <img
                          src={lesson.lesson_image_path}
                          alt=""
                          className="h-11 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-11 w-14 shrink-0 rounded-lg bg-violet-50" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {lesson.classroomName}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
