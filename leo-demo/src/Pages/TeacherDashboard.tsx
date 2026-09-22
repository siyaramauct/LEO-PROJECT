import {
  BookOpen,
  Users,
  BarChart3,
  Calendar,
  Plus,
  ChevronRight,
  ClipboardCheck,
  Home,
  User,
  Settings,
  LogOut,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavItem from "../Components/NavItem";
import NotificationBell from "../Components/NotificationBell";
import SidebarItem from "../Components/SidebarItem";
import StatCard from "../Components/StatCard";
import { useAuth } from "../../context/AuthContext.tsx";
import { supabase } from "../supabase-client";

type ActiveClassroom = {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  studentCount: number; // calculated from classroom_students table
  lessonCount: number; // calculated from lessons table
};

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
  const [classrooms, setClassrooms] = useState<ActiveClassroom[] | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [lessonCount, setLessonCount] = useState<number>(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
        setClassrooms(null);
        return;
      }

      const classroom = data?.[0];
      if (!classroom) {
        setClassrooms(null);
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
            ? supabase.storage
                .from("images")
                .getPublicUrl(classroom.cover_image_path).data.publicUrl
            : "/classRoomIllustration.png",
          imageAlt: `${classroom.classroom_name} classroom cover`,
          studentCount: studentCountByClassroom[classroom.classroom_id] ?? 0,
          lessonCount: lessonCountByClassroom[classroom.classroom_id] ?? 0,
        }))
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
        return;
      }

      // If the teacher has no classrooms yet, they can't have any lessons.
      if (!teacherClassrooms || teacherClassrooms.length === 0) {
        setLessons([]);
        setLessonCount(0);
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
        .order("created_at", { ascending: false })
        .limit(4); // only show 4 lessons in the dashboard preview

      if (lessonsError) {
        console.error("Failed to load the lessons:", lessonsError);
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
        wordCountByLesson[row.lesson_id] =
          (wordCountByLesson[row.lesson_id] ?? 0) + 1;
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
          lesson_image_path: supabase.storage .from("images").getPublicUrl(lesson.lesson_image_path).data.publicUrl,
          wordCount: wordCountByLesson[lesson.lesson_id] ?? 0,
          imageAlt: `${lesson.title} lesson cover`,
          created_at: lesson.created_at,
        }))
      );

      // Step 4: get the REAL total lesson count across all of this
      // teacher's classrooms, and every lesson's id — we need the ids to
      // pull quiz stats below. We can't use recentLessons here — that's
      // capped at 4 by the limit() above and would undercount everything.
      const { data: allLessons, error: allLessonsError } = await supabase
        .from("lessons")
        .select("lesson_id")
        .in("classroom_id", classroomIds);

      if (allLessonsError) {
        console.error("Failed to count lessons:", allLessonsError);
        return;
      }

      setLessonCount(allLessons?.length ?? 0);

      const allLessonIds = (allLessons ?? []).map((lesson) => lesson.lesson_id);
      if (!allLessonIds.length) {
        setQuizzesCompleted(0);
        setAverageScore(null);
        return;
      }

      // Step 5: quiz stats — each mcq's score_ceiling tells us the max
      // possible score for its lesson, so we can turn a raw attempt score
      // into a percentage the same way ClassProgress.tsx does.
      const [{ data: mcqs, error: mcqsError }, { data: attempts, error: attemptsError }] =
        await Promise.all([
          supabase.from("mcqs").select("lesson_id, score_ceiling").in("lesson_id", allLessonIds),
          supabase
            .from("lesson_attempts")
            .select("lesson_id, score")
            .in("lesson_id", allLessonIds)
            .not("completed_at", "is", null),
        ]);

      if (mcqsError || attemptsError) {
        console.error("Failed to load quiz stats:", mcqsError ?? attemptsError);
        return;
      }

      const scoreCeilingByLesson: Record<string, number> = {};
      (mcqs ?? []).forEach((mcq) => {
        if (mcq.score_ceiling !== null) scoreCeilingByLesson[mcq.lesson_id] = mcq.score_ceiling;
      });

      const completedAttempts = attempts ?? [];
      setQuizzesCompleted(completedAttempts.length);

      const scorePercentages = completedAttempts
        .map((attempt) => {
          const ceiling = scoreCeilingByLesson[attempt.lesson_id];
          return ceiling && ceiling > 0 && attempt.score !== null ? (Number(attempt.score) / ceiling) * 100 : null;
        })
        .filter((score): score is number => score !== null);

      setAverageScore(
        scorePercentages.length
          ? Math.round(scorePercentages.reduce((total, score) => total + score, 0) / scorePercentages.length)
          : null
      );
    };

    void loadLessons();
  }, [session?.user]);

  const today = new Date();
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const mondayOffset = (today.getDay() + 6) % 7; // Sunday is 0, so shift the week to start on Monday
  const weekDays = weekdayLabels.map((label, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - mondayOffset + index);
    return { label, day: date.getDate(), isToday: date.toDateString() === today.toDateString() };
  });
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              Hi, {teacher?.name} 👋
            </h1>

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

                {classrooms?.[0] ? <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                  <img src={classrooms[0].image} alt={classrooms[0].imageAlt} className="h-full w-full object-contain" />
                </div> : <div aria-hidden="true" className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-violet-600/50">
                  <div className="absolute -right-4 -top-5 h-16 w-16 rounded-full border-[10px] border-violet-200/50" />
                  <div className="absolute -bottom-5 left-3 h-16 w-16 rotate-45 rounded-2xl bg-fuchsia-300/30" />
                  <div className="absolute bottom-4 right-4 h-3 w-10 -rotate-12 rounded-full bg-white/25" />
                </div>}
              </div>

              <Link
                to={
                  classrooms?.[0]
                    ? `/teacher-classroom/${classrooms[0].id}`
                    : "/create-classroom"
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
            TODAY'S OVERVIEW
        ========================== */}
        <section className="mt-3 shrink-0 px-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Account Overview</h2>
            <button className="text-xs font-medium text-violet-700">
              View reports
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <BookOpen size={16} />
              </div>
              <p className="mt-2 text-lg font-bold">{lessonCount}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Lessons created
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <Users size={16} />
              </div>
              <p className="mt-2 text-lg font-bold">
                {classrooms?.length ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Active classrooms
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <ClipboardCheck size={16} />
              </div>
              <p className="mt-2 text-lg font-bold">{quizzesCompleted}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Quizzes completed
              </p>
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700">
                <Plus size={20} />
              </div>
              <div>
                <p className="text-xs font-bold">Create Lesson</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Add vocabulary
                </p>
              </div>
            </Link>

            <Link
              to="/TeacherClassroom"
              className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
                <Users size={19} />
              </div>
              <div>
                <p className="text-xs font-bold">Students</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  View your students
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* =========================
            MY CLASSES
        ========================== */}
        <section className="mt-3 shrink-0 px-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">My Classes</h2>
            <button className="text-xs font-medium text-violet-700">
              View all
            </button>
          </div>

          {classrooms === null ? (
            <p className="text-xs text-slate-400">
              You haven't created any classrooms yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {classrooms.map((item) => (
                <Link
                  key={item.id}
                  to={`/teacher-classroom/${item.id}`}
                  className="flex h-32 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white text-center shadow-sm transition hover:border-violet-200"
                >
                  <div className="min-h-0 w-full flex-1 overflow-hidden bg-slate-50">
                    <img
                      src={item.image ?? "/classRoomIllustration.png"}
                      alt={item.imageAlt}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="mt-2 min-w-0 shrink-0 px-2 pb-2">
                    <p className="truncate text-[10px] font-bold">
                      {item.name}
                    </p>
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
        <section className="mt-3 min-h-0 flex-1 px-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Recent Lessons</h2>
            <button className="text-xs font-medium text-violet-700">
              View all
            </button>
          </div>

          {lessons === null || lessons.length === 0 ? (
            <p className="text-xs text-slate-400">
              You haven't created any lessons yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.lesson_id}
                  to={`/teacher-classroom/${lesson.classroom_id}/lesson/${lesson.lesson_id}`}
                  className="flex min-w-0 items-center rounded-xl border border-slate-100 bg-white p-2 text-left transition hover:border-violet-200"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    <img
                      src={lesson.lesson_image_path ?? "/classRoomIllustration.png"}
                      alt={lesson.imageAlt}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="ml-2 min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold">
                      {lesson.title}
                    </p>
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
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" active />
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

          <div className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-7xl flex-col p-4">
            {/* Desktop Stats */}
            <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={<Users />} label="Classrooms" value={String(classrooms?.length ?? 0)} />
              <StatCard icon={<BookOpen />} label="Lessons Created" value={String(lessonCount)} />
              <StatCard icon={<ClipboardCheck />} label="Quizzes Completed" value={String(quizzesCompleted)} />
              <StatCard icon={<BarChart3 />} label="Average Score" value={averageScore === null ? "—" : `${averageScore}%`} progress={averageScore ?? 0} />
            </div>

            {/* Main Grid */}
            <div className="mt-3 grid shrink-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] xl:items-stretch">
              {/* Classes */}
              <section className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">My Classes</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Manage your active classrooms.
                    </p>
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
                  {classrooms === null ? (
                    <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/60 px-4 py-6 text-center">
                      <Users className="mx-auto text-violet-700" size={22} />
                      <p className="mt-2 text-sm font-semibold text-slate-800">Your first classroom starts here</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Create a classroom to organise lessons and invite learners.</p>
                      <Link to="/create-classroom" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"><Plus size={15} /> Create Classroom</Link>
                    </div>
                  ) : (
                    classrooms.map((item) => (
                      <Link
                        key={item.id}
                        to={`/teacher-classroom/${item.id}`}
                        className="flex items-center rounded-lg border border-slate-100 p-2"
                      >
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 p-1">
                          <img
                            src={item.image ?? "/classRoomIllustration.png"}
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
                    <p className="text-xs font-semibold text-violet-700">This week</p>
                    <h3 className="mt-1 text-lg font-bold">{monthLabel}</h3>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg  text-violet-700">
                    <Calendar size={20} />
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2">
                  {weekDays.map((weekDay) => (
                    <div
                      key={weekDay.label}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-2 ${
                        weekDay.isToday ? "bg-violet-700 text-white" : "border border-slate-100 bg-white text-slate-700"
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${weekDay.isToday ? "text-violet-100" : "text-slate-400"}`}>
                        {weekDay.label}
                      </span>
                      <span className="text-sm font-bold">{weekDay.day}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/create-lesson"
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
                >
                  Create lesson
                  <ChevronRight size={17} />
                </Link>
              </section>
            </div>

            {/* Recent Lessons */}
            <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Recent Lessons</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Lessons recently created for your classrooms.
                  </p>
                </div>

                <button className="text-xs font-semibold text-violet-700">
                  View all
                </button>
              </div>

              <div className="mt-2 space-y-1.5">
                {lessons === null || lessons.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    You haven't created any lessons yet.
                  </p>
                ) : (
                  lessons.slice(0, 2).map((lesson) => (
                    <Link
                      key={lesson.lesson_id}
                      to={`/teacher-classroom/${lesson.classroom_id}/lesson/${lesson.lesson_id}`}
                      className="flex items-center rounded-lg border border-slate-100 p-2"
                    >
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                        <img
                          src={lesson.lesson_image_path ?? "/classRoomIllustration.png"}
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
    </div>
  );
}
