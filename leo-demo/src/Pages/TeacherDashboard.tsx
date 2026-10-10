import {
  Users,
  BarChart3,
  Calendar,
  Plus,
  ChevronRight,
  Home,
  User,
  Settings,
  LogOut,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import LoadingScreen from "../Components/LoadingScreen";
import NavItem from "../Components/NavItem";
import NotificationBell from "../Components/NotificationBell";
import ScheduledLessonCard, {
  type ScheduledLesson,
  type ScheduledLessonEdits,
} from "../Components/ScheduledLessonCard";
import SidebarItem from "../Components/SidebarItem";
import DeleteAccountDialog from "../Components/DeleteAccountDialog";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";
import usePreloadImages from "../hooks/usePreloadImages";
import { formatDateKey, releaseDateToIso, toDateKey } from "../utils/releaseDate";
import { BROKEN_IMAGE_URL } from "../utils/images";

type ActiveClassroom = {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  studentCount: number; // calculated from classroom_students table
  lessonCount: number; // calculated from lessons table
};

// The dashboard previews the newest few; the full lists live on their own pages.
const DASHBOARD_ROW_LIMIT = 3;

type Lesson = {
  lesson_id: string;
  classroom_id: string;
  classroomName: string; // pulled from the related classroom row
  title: string;
  description: string;
  lesson_image_path: string;
  wordCount: number; // count of matching rows in the flashcards table
  created_at: Date;
  imageAlt: string;
};

export default function TeacherDashboard() {
  const { profile, logout } = useAuth();
  const { session } = useAuth();
  const teacher = profile;
  const avatar = profile?.name[0];
  const navigate = useNavigate();
  // null = still loading; an empty array means the teacher genuinely has none.
  const [classrooms, setClassrooms] = useState<ActiveClassroom[] | null>(null);
  const [classroomsError, setClassroomsError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  // Calendar day picked on the dashboard; today means "create now", a later day schedules the lesson.
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  // Lessons whose release date is still ahead; null while loading.
  const [scheduledLessons, setScheduledLessons] = useState<ScheduledLesson[] | null>(null);
  const [scheduledLessonsError, setScheduledLessonsError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      const { data, error } = await supabase
        .from("classrooms")
        .select("*")
        .eq("teacher_id", session.user.id)
        .order("created_date", { ascending: false });

      if (error) {
        console.error("Failed to load the active classroom:", error);
        setClassroomsError("Your classrooms could not be loaded right now.");
        setClassrooms([]);
        return;
      }

      const classroom = data?.[0];
      if (!classroom) {
        setClassrooms([]);
        return;
      }

      // Grab just the ids so we can look up students/lessons for these
      // specific classrooms in the two queries below.
      const classroomIds = data.map((c) => c.classroom_id);

      // Count students per classroom: fetch every enrollment row for
      // these classrooms (just the columns we need), then tally how many
      // times each classroom_id shows up. That tally IS the student count.
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("classroom_students")
        .select("classroom_id, student_id")
        .in("classroom_id", classroomIds);

      if (enrollmentsError) {
        console.error("Failed to load classroom enrollments:", enrollmentsError);
      }

      // Count lessons per classroom the exact same simple way — fetch
      // every lesson's classroom_id for these classrooms, then tally.
      const { data: classroomLessons, error: classroomLessonsError } = await supabase
        .from("lessons")
        .select("lesson_id, classroom_id")
        .in("classroom_id", classroomIds);

      if (classroomLessonsError) {
        console.error("Failed to load lesson counts:", classroomLessonsError);
      }

      // Turn a flat list like [{classroom_id:"a"},{classroom_id:"a"},{classroom_id:"b"}]
      // into a simple lookup: { a: 2, b: 1 }
      const studentCountByClassroom: Record<string, number> = {};
      (enrollments ?? []).forEach((row) => {
        studentCountByClassroom[row.classroom_id] =
          (studentCountByClassroom[row.classroom_id] ?? 0) + 1;
      });

      const lessonCountByClassroom: Record<string, number> = {};
      (classroomLessons ?? []).forEach((row) => {
        lessonCountByClassroom[row.classroom_id] =
          (lessonCountByClassroom[row.classroom_id] ?? 0) + 1;
      });

      setClassrooms(
        data.map((classroom) => ({
          id: classroom.classroom_id,
          name: classroom.classroom_name,
          // Guard: only call getPublicUrl if a path actually exists.
          // Same issue as lessons — an unguarded call crashes on a
          // missing/null cover_image_path and kills the whole list.
          image: classroom.cover_image_path
            ? supabase.storage.from("images").getPublicUrl(classroom.cover_image_path).data
                .publicUrl
            : BROKEN_IMAGE_URL,
          imageAlt: `${classroom.classroom_name} classroom cover`,
          studentCount: studentCountByClassroom[classroom.classroom_id] ?? 0,
          lessonCount: lessonCountByClassroom[classroom.classroom_id] ?? 0,
        })),
      );
    };
    void loadClassrooms();
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    const loadLessons = async () => {
      // Step 1: lessons don't have a teacher_id column — they only know
      // which classroom they belong to. So first we find this teacher's
      // classrooms, and we only need the id column for that.
      const { data: teacherClassrooms, error: classroomsError } = await supabase
        .from("classrooms")
        .select("classroom_id")
        .eq("teacher_id", session.user.id);

      if (classroomsError) {
        console.error("Failed to load classrooms for lessons:", classroomsError);
        setLessonsError("Your recent lessons could not be loaded right now.");
        return;
      }

      // If the teacher has no classrooms yet, they can't have any lessons.
      if (!teacherClassrooms || teacherClassrooms.length === 0) {
        setLessons([]);
        return;
      }

      // Step 2: turn [{ classroom_id: "a" }, { classroom_id: "b" }]
      // into a plain array of ids: ["a", "b"]
      const classroomIds = teacherClassrooms.map((c) => c.classroom_id);

      // Step 3: fetch just a few recent lessons to preview on the dashboard.
      // We don't need every lesson here, only the most recent ones.
      // The "classrooms(classroom_name)" part asks Supabase to also pull
      // in the related classroom's name, using the classroom_id foreign
      // key — this saves us a second manual lookup.
      const { data: recentLessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*, classrooms(classroom_name)")
        .in("classroom_id", classroomIds)
        // Postgres sorts nulls first when descending, which would push undated
        // lessons above the newest ones.
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(DASHBOARD_ROW_LIMIT);

      if (lessonsError) {
        console.error("Failed to load the lessons:", lessonsError);
        setLessonsError("Your recent lessons could not be loaded right now.");
        return;
      }

      // Step 3b: count words per lesson using the flashcards table — each
      // flashcard row is one word, so counting rows per lesson_id gives us
      // the word count for that lesson.
      const lessonIds = recentLessons.map((lesson) => lesson.lesson_id);

      const { data: flashcards, error: flashcardsError } = await supabase
        .from("flashcards")
        .select("flashcard_id, lesson_id")
        .in("lesson_id", lessonIds);

      if (flashcardsError) {
        console.error("Failed to load flashcards for word count:", flashcardsError);
      }

      // Same simple tally trick as the student/lesson counts above:
      // turn a flat list of rows into { lessonId: count }
      const wordCountByLesson: Record<string, number> = {};
      (flashcards ?? []).forEach((row) => {
        wordCountByLesson[row.lesson_id] = (wordCountByLesson[row.lesson_id] ?? 0) + 1;
      });

      setLessons(
        recentLessons.map((lesson) => ({
          lesson_id: lesson.lesson_id,
          classroom_id: lesson.classroom_id,
          // The embedded classrooms(...) select above gives us this as
          // lesson.classrooms.classroom_name — fall back if it's missing.
          classroomName: lesson.classrooms?.classroom_name ?? "Unknown classroom",
          title: lesson.title,
          description: lesson.description,
          // Guarded like classroom covers so the "?? fallback" in the JSX actually kicks in.
          lesson_image_path: lesson.lesson_image_path
            ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path).data.publicUrl
            : BROKEN_IMAGE_URL,
          wordCount: wordCountByLesson[lesson.lesson_id] ?? 0,
          imageAlt: `${lesson.title} lesson cover`,
          created_at: lesson.created_at,
        })),
      );
    };

    // finally: every exit path (including the early error returns) must end
    // loading, otherwise the dashboard would sit behind the loader forever.
    void loadLessons().finally(() => setIsLessonsLoading(false));
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    const loadScheduledLessons = async () => {
      // The inner join keeps only lessons in this teacher's classrooms.
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
    // Follow a rescheduled lesson to its new day so the change is visible.
    setSelectedDateKey(edits.releaseDateKey);
    return null;
  }

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

  const imageUrls = useMemo(
    () =>
      classrooms === null || isLessonsLoading
        ? null
        : [...classrooms.map((c) => c.image), ...(lessons ?? []).map((l) => l.lesson_image_path)],
    [classrooms, lessons, isLessonsLoading],
  );
  const imagesReady = usePreloadImages(imageUrls);

  // Two-week planner: this week and next, each running Monday to Sunday.
  const today = new Date();
  const todayKey = toDateKey(today);
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const mondayOffset = (today.getDay() + 6) % 7; // Sunday is 0, so shift the week to start on Monday
  const plannerWeeks = ["This week", "Next week"].map((label, weekIndex) => ({
    label,
    days: weekdayLabels.map((_, dayIndex) => {
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
  // Two weeks can cross into the next month, e.g. "October – November 2026".
  const plannerLastDay = new Date(`${plannerWeeks[1].days[6].dateKey}T00:00:00`);
  const monthLabel =
    plannerLastDay.getMonth() === today.getMonth()
      ? today.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${today.toLocaleDateString("en-US", { month: "long" })} – ${plannerLastDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  // The selection is stored as a key, so it can go stale if the dashboard stays open past midnight.
  const isScheduling = selectedDateKey > todayKey;
  const activeDateKey = selectedDateKey < todayKey ? todayKey : selectedDateKey;
  const scheduledCountByDay: Record<string, number> = {};
  (scheduledLessons ?? []).forEach((lesson) => {
    scheduledCountByDay[lesson.releaseDateKey] =
      (scheduledCountByDay[lesson.releaseDateKey] ?? 0) + 1;
  });
  const selectedDayLessons = (scheduledLessons ?? []).filter(
    (lesson) => lesson.releaseDateKey === activeDateKey,
  );

  if (classrooms === null || isLessonsLoading || scheduledLessons === null || !imagesReady) {
    return <LoadingScreen label="Loading your dashboard" />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* =========================
          MOBILE APP
      ========================== */}
      <div className="mx-auto flex h-dvh max-w-4xl flex-col overflow-hidden bg-white pb-16 lg:hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2 sm:px-6">
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">Hi, {teacher?.name} 👋</h1>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Here's what's happening in your classrooms.
            </p>
          </div>

          <NotificationBell />
        </header>

        {/* =========================
            ACTIVE CLASS
        ========================== */}
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
                    {classrooms?.[0]?.name ?? "Create your first classroom"}
                  </h2>
                  <p className="mt-1 text-xs text-violet-100">
                    {classrooms?.[0]
                      ? `${classrooms[0].studentCount} students · ${classrooms[0].lessonCount} lessons`
                      : "Set up a space for your learners and lessons"}
                  </p>
                </div>

                {classrooms?.[0] ? (
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                    <img
                      src={classrooms[0].image}
                      alt={classrooms[0].imageAlt}
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
                  classrooms?.[0] ? `/teacher-classroom/${classrooms[0].id}` : "/create-classroom"
                }
                className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                {classrooms?.[0] ? "View Classroom" : "Create Classroom"}
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================
            QUICK ACTIONS
        ========================== */}
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

        {/* =========================
            MY CLASSES
        ========================== */}
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
                      src={item.image ?? BROKEN_IMAGE_URL}
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

        {/* =========================
            RECENT LESSONS
        ========================== */}
        <section className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-3 sm:px-6">
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
                      src={lesson.lesson_image_path ?? BROKEN_IMAGE_URL}
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

        {/* =========================
            MOBILE NAVIGATION
        ========================== */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" active />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" />
          <Link
            to="/learning-hub"
            aria-label="Open the learning hub"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200"
          >
            <Plus size={23} />
          </Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" to="/teacher-profile" />
        </nav>
      </div>

      {/* =========================
          DESKTOP VERSION
      ========================== */}
      <div className="hidden min-h-dvh lg:flex">
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2">
            <h1 className="text-2xl font-bold tracking-tight">LEO</h1>
            <p className="text-xs text-violet-200">Teacher Portal</p>
          </div>

          <nav className="space-y-2">
            <SidebarItem
              icon={<Home size={18} />}
              label="Dashboard"
              to="/teacher-dashboard"
              active
            />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" to="/learning-hub" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>

          <div className="mt-auto space-y-2">
            <SidebarItem icon={<Settings size={18} />} label="Settings" to="/teacher-profile" />
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {/* Desktop Header */}
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
                  {avatar}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{teacher?.name}</p>
                  <p className="text-xs text-slate-400">{teacher?.user_role}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-7xl flex-col gap-4 p-4 xl:p-6">
            {/* Main Grid */}
            <div className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] xl:items-stretch">
              {/* Classes */}
              {/* self-start: keep its own height when the planner grows with scheduled lessons. */}
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
                            src={item.image ?? BROKEN_IMAGE_URL}
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

                        <button className="rounded-lg p-2 hover:bg-slate-50">
                          <ChevronRight size={17} />
                        </button>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              {/* Calendar */}
              <section className="flex min-h-[17rem] flex-col rounded-xl border border-slate-100 bg-white p-5">
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
                      <div className="grid grid-cols-7 gap-2">
                        {week.days.map((day, dayIndex) => {
                          const isSelected = day.dateKey === activeDateKey;
                          const scheduledCount = scheduledCountByDay[day.dateKey] ?? 0;
                          const dayLabel = day.isToday
                            ? `Create a lesson today, ${formatDateKey(day.dateKey)}`
                            : formatDateKey(day.dateKey);
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
                              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-2 pb-2.5 transition ${
                                isSelected
                                  ? "bg-violet-700 text-white"
                                  : day.isPast
                                    ? "cursor-not-allowed border border-slate-100 bg-white text-slate-300"
                                    : day.isToday
                                      ? "border border-slate-100 bg-white text-violet-700 hover:border-slate-200"
                                      : "border border-slate-100 bg-white text-slate-700 hover:border-slate-200"
                              }`}
                            >
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-violet-100" : day.isPast ? "text-slate-300" : "text-slate-400"}`}
                              >
                                {weekdayLabels[dayIndex]}
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

                {scheduledLessonsError && (
                  <p role="alert" className="mt-3 text-xs text-red-700">
                    {scheduledLessonsError}
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
                          onSave={saveScheduledLesson}
                          onDelete={setScheduledLessonToDelete}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Today needs no explanation; only a later day gets a note about its release. */}
                {isScheduling && (
                  <p className="mt-4 text-xs text-slate-500">
                    New lessons will release on {formatDateKey(activeDateKey)}.
                  </p>
                )}

                <div className="mt-auto pt-5">
                  <Link
                    to={
                      isScheduling
                        ? `/create-lesson?releaseDate=${activeDateKey}`
                        : "/create-lesson"
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
                  >
                    {isScheduling ? "Schedule lesson" : "Create lesson"}
                    <ChevronRight size={17} />
                  </Link>
                </div>
              </section>
            </div>

            {/* Recent Lessons */}
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
                          src={lesson.lesson_image_path ?? BROKEN_IMAGE_URL}
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

                      <button className="rounded-lg p-2 hover:bg-slate-50">
                        <ChevronRight size={17} />
                      </button>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <DeleteAccountDialog
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
