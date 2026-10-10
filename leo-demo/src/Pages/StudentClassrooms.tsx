// -----------------------------------------------------------------------------
// Student Classrooms
//
// Every classroom the student has joined, with overall counts, a form to join
// a new classroom by code, and a search box. Each card shows the classroom's
// lessons and how many the student has completed, and has a leave button that
// asks for confirmation first.
//
// Route: /student/classrooms || Access: students
// -----------------------------------------------------------------------------

import { BookOpen, Check, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../Components/ConfirmDialog";
import JoinClassroomForm from "../Components/JoinClassroomForm";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import StudentClassroomCard, {
  type StudentClassroomCardData,
} from "../Components/StudentClassroomCard";
import { supabase } from "../supabase-client";
import { bucketImageUrlOrBroken } from "../utils/images";
import { matchesSearch } from "../utils/listControls";
import { notifyUser } from "../utils/notifications";

// -- Types --------------------------------------------------------------------

type Classroom = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
};
type Lesson = {
  lesson_id: string;
  classroom_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
};

// -- Page ---------------------------------------------------------------------

export default function StudentClassrooms() {
  const { session, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [classroomSearch, setClassroomSearch] = useState("");
  const [classroomToLeave, setClassroomToLeave] = useState<StudentClassroomCardData | null>(null);
  const [isLeavingClassroom, setIsLeavingClassroom] = useState(false);

  // -- Load classrooms, lessons and completions --
  // 1. The student's enrolments.
  // 2. Those classrooms and their released lessons, in parallel.
  // 3. Which of those lessons the student has completed.
  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      setIsLoading(true);
      setError("");
      const { data: enrolments, error: enrolmentError } = await supabase
        .from("classroom_students")
        .select("classroom_id")
        .eq("student_id", session.user.id);
      if (enrolmentError) {
        setError(enrolmentError.message);
        setIsLoading(false);
        return;
      }
      const classroomIds = (enrolments ?? []).map((enrolment) => enrolment.classroom_id);
      if (!classroomIds.length) {
        setClassrooms([]);
        setLessons([]);
        setIsLoading(false);
        return;
      }
      const [classroomResult, lessonResult] = await Promise.all([
        supabase
          .from("classrooms")
          .select("classroom_id, classroom_name, description, cover_image_path")
          .in("classroom_id", classroomIds),
        supabase
          .from("lessons")
          .select("lesson_id, classroom_id, title, description, lesson_image_path")
          .in("classroom_id", classroomIds)
          .lte("release_date", new Date().toISOString()),
      ]);
      if (classroomResult.error || lessonResult.error) {
        setError(
          classroomResult.error?.message ??
            lessonResult.error?.message ??
            "Could not load your classrooms.",
        );
      } else {
        const enrolledLessons = (lessonResult.data ?? []) as Lesson[];
        setClassrooms((classroomResult.data ?? []) as Classroom[]);
        setLessons(enrolledLessons);
        const lessonIds = enrolledLessons.map((lesson) => lesson.lesson_id);
        if (lessonIds.length) {
          const { data: attempts } = await supabase
            .from("lesson_attempts")
            .select("lesson_id")
            .eq("student_id", session.user.id)
            .in("lesson_id", lessonIds)
            .not("completed_at", "is", null);
          setCompletedLessonIds([...new Set((attempts ?? []).map((attempt) => attempt.lesson_id))]);
        } else {
          setCompletedLessonIds([]);
        }
      }
      setIsLoading(false);
    };
    void loadClassrooms();
  }, [session?.user]);

  // -- Leave a classroom --
  // Runs after the student confirms in the dialog. Deletes their enrolment,
  // tells the teacher, then removes the classroom from the page without a reload.
  async function leaveClassroom() {
    if (!classroomToLeave || !session?.user || isLeavingClassroom) return;
    setIsLeavingClassroom(true);
    const teacher = await supabase
      .from("classrooms")
      .select("teacher_id")
      .eq("classroom_id", classroomToLeave.id)
      .single();
    if (teacher.error) {
      console.error("Failed to fetch classroom teacher:", teacher.error);
      setIsLeavingClassroom(false);
      window.alert("Could not verify classroom teacher. Please try again.");
      return;
    }
    const { error: leaveError } = await supabase
      .from("classroom_students")
      .delete()
      .eq("classroom_id", classroomToLeave.id)
      .eq("student_id", session.user.id);

    if (leaveError) {
      console.error("Failed to leave classroom:", leaveError);
      setIsLeavingClassroom(false);
      window.alert("You could not be removed from this classroom. Please try again.");
      return;
    }

    const studentName =
      [profile?.name, profile?.surname].filter(Boolean).join(" ") ||
      session.user.email ||
      "A student";
    await notifyUser({
      recipient_id: teacher.data.teacher_id,
      type: "student_left_classroom",
      title: "Student left classroom",
      body: `${studentName} left "${classroomToLeave.name}".`,
      link_url: `/teacher-classroom/${classroomToLeave.id}`,
    });

    const remainingLessonIds = lessons
      .filter((lesson) => lesson.classroom_id !== classroomToLeave.id)
      .map((lesson) => lesson.lesson_id);

    setClassrooms((prev) =>
      prev.filter((classroom) => classroom.classroom_id !== classroomToLeave.id),
    );
    setLessons((prev) => prev.filter((lesson) => lesson.classroom_id !== classroomToLeave.id));
    setCompletedLessonIds((prev) =>
      prev.filter((lessonId) => remainingLessonIds.includes(lessonId)),
    );
    setClassroomToLeave(null);
    setIsLeavingClassroom(false);
  }

  // -- Derived values --

  const lessonCount = lessons.length;
  const completedLessons = completedLessonIds.length;
  const visibleClassrooms = classrooms.filter((classroom) =>
    matchesSearch(classroomSearch, classroom.classroom_name, classroom.description),
  );

  // Turns a classroom row into what its card displays.
  const toCardData = (classroom: Classroom): StudentClassroomCardData => {
    const classroomLessons = lessons.filter(
      (lesson) => lesson.classroom_id === classroom.classroom_id,
    );
    const completedCount = classroomLessons.filter((lesson) =>
      completedLessonIds.includes(lesson.lesson_id),
    ).length;
    const image = bucketImageUrlOrBroken(classroom.cover_image_path);

    return {
      id: classroom.classroom_id,
      name: classroom.classroom_name,
      description: classroom.description ?? "Your teacher has shared lessons for this classroom.",
      lessonCount: classroomLessons.length,
      completedCount,
      image,
      imageAlt: `${classroom.classroom_name} classroom cover`,
    };
  };

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />

      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold">My classrooms</h1>
              <p className="mt-1 text-xs text-slate-500">
                Open a classroom to see lessons and teacher resources.
              </p>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-3 gap-2 sm:gap-3">
            <article className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
              <Users size={19} className="text-violet-700" />
              <p className="mt-3 text-xl font-bold sm:mt-4 sm:text-2xl">{classrooms.length}</p>
              <p className="mt-1 text-xs text-slate-500">Classrooms</p>
            </article>
            <article className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
              <BookOpen size={19} className="text-violet-700" />
              <p className="mt-3 text-xl font-bold sm:mt-4 sm:text-2xl">{lessonCount}</p>
              <p className="mt-1 text-xs text-slate-500">Available lessons</p>
            </article>
            <article className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
              <Check size={19} className="text-violet-700" />
              <p className="mt-3 text-xl font-bold sm:mt-4 sm:text-2xl">{completedLessons}</p>
              <p className="mt-1 text-xs text-slate-500">Completed lessons</p>
            </article>
          </section>

          <JoinClassroomForm
            inputId="classroom-code"
            className="mt-5 border-b border-slate-200 bg-white px-4 py-5 sm:px-6"
          />

          {isLoading && (
            <p className="py-12 text-center text-sm text-slate-500">Loading your classrooms...</p>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading &&
            !error &&
            (classrooms.length === 0 ? (
              <section className="rounded-xl border border-slate-100 bg-white px-5 py-12 text-center">
                <Users size={26} className="mx-auto text-slate-300" />
                <h2 className="mt-3 text-sm font-semibold">No classrooms yet</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ask your teacher for an invitation code, then enter it above.
                </p>
              </section>
            ) : (
              <>
                <section className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Find a classroom</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Search by classroom name or topic.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-600"
                    />
                    <input
                      value={classroomSearch}
                      onChange={(event) => setClassroomSearch(event.target.value)}
                      placeholder="Search classrooms"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                      aria-label="Search your classrooms"
                    />
                    {classroomSearch && (
                      <button
                        type="button"
                        onClick={() => setClassroomSearch("")}
                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Clear classroom search"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </section>

                {visibleClassrooms.length === 0 ? (
                  <section className="mt-4 rounded-xl border border-violet-100 bg-white px-5 py-10 text-center">
                    <Search size={22} className="mx-auto text-violet-300" />
                    <h2 className="mt-3 text-sm font-semibold">No classrooms match that search</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Try a class name, subject, or a broader keyword.
                    </p>
                  </section>
                ) : (
                  <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleClassrooms.map((classroom) => (
                      <StudentClassroomCard
                        key={classroom.classroom_id}
                        classroom={toCardData(classroom)}
                        onLeave={setClassroomToLeave}
                      />
                    ))}
                  </section>
                )}
              </>
            ))}
        </div>
      </main>

      <ConfirmDialog
        open={Boolean(classroomToLeave)}
        isDeleting={isLeavingClassroom}
        onCancel={() => setClassroomToLeave(null)}
        onConfirm={() => void leaveClassroom()}
        title={`Leave ${classroomToLeave?.name ?? "this classroom"}?`}
        description="You will lose access to this classroom's lessons and resources until you join again with its code."
        confirmLabel="Leave classroom"
        deletingLabel="Leaving classroom..."
      />
    </div>
  );
}
