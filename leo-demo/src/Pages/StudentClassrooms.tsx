// -----------------------------------------------------------------------------
// Student Classrooms
//
// Every classroom the student has joined, with a form to join a new
// classroom by code, and a search box. Each card shows the classroom's
// lessons and how many the student has completed, and has a leave button that
// asks for confirmation first.
//
// Route: /student/classrooms || Access: students
// -----------------------------------------------------------------------------

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../Components/ConfirmDialog";
import JoinClassroomForm from "../Components/JoinClassroomForm";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import StudentClassroomCard, {
  type StudentClassroomCardData,
} from "../Components/StudentClassroomCard";
import { type ClassroomSummary } from "../data/classrooms";
import { errorMessage } from "../data/errors";
import { getReleasedLessons } from "../data/lessons";
import {
  getEnrolledClassrooms,
  leaveClassroom,
  studentDisplayName,
} from "../services/classroomService";
import { getCompletedLessonIds } from "../services/studentLessonService";
import { bucketImageUrlOrBroken } from "../utils/images";
import { matchesSearch } from "../utils/listControls";

// -- Types --------------------------------------------------------------------

type Classroom = ClassroomSummary;
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
  // classroomService and lessonService do the work, in the numbered steps below.
  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      setIsLoading(true);
      setError("");

      try {
        // 1. The student's classrooms.
        const enrolledClassrooms = await getEnrolledClassrooms(session.user.id);
        const classroomIds = enrolledClassrooms.map((classroom) => classroom.classroom_id);

        setClassrooms(enrolledClassrooms);

        if (classroomIds.length === 0) {
          setLessons([]);
          setCompletedLessonIds([]);
          return;
        }

        // 2. Their released lessons.
        const enrolledLessons = await getReleasedLessons(classroomIds);
        const lessonIds = enrolledLessons.map((lesson) => lesson.lesson_id);

        setLessons(enrolledLessons);

        if (lessonIds.length === 0) {
          setCompletedLessonIds([]);
          return;
        }

        // 3. Which of those lessons the student has completed.
        setCompletedLessonIds(await getCompletedLessonIds(session.user.id, lessonIds));
      } catch (loadError) {
        console.error("Failed to load classrooms:", loadError);
        setError(errorMessage(loadError, "Could not load your classrooms."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadClassrooms();
  }, [session?.user]);

  // -- Leave a classroom --
  // Runs after the student confirms in the dialog. classroomService removes
  // the enrolment and tells the teacher; the classroom then leaves the page
  // without a reload.
  async function handleLeave() {
    if (!classroomToLeave || !session?.user || isLeavingClassroom) return;
    setIsLeavingClassroom(true);
    try {
      await leaveClassroom({
        studentId: session.user.id,
        studentName: studentDisplayName(profile, session.user.email),
        classroomId: classroomToLeave.id,
        classroomName: classroomToLeave.name,
      });
    } catch (leaveError) {
      console.error("Failed to leave classroom:", leaveError);
      setIsLeavingClassroom(false);
      window.alert(
        errorMessage(leaveError, "You could not leave this classroom. Please try again."),
      );
      return;
    }

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
          <JoinClassroomForm
            inputId="classroom-code"
            className="mb-4 rounded-xl border border-slate-100 bg-white px-4 py-5 sm:px-6"
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
                <h2 className="text-sm font-semibold">No classrooms yet</h2>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-violet-600 focus:bg-white"
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
                    <h2 className="text-sm font-semibold">No classrooms match that search</h2>
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
        onConfirm={() => void handleLeave()}
        title={`Leave ${classroomToLeave?.name ?? "this classroom"}?`}
        description="You will lose access to this classroom's lessons and resources until you join again with its code."
        confirmLabel="Leave classroom"
        deletingLabel="Leaving classroom..."
      />
    </div>
  );
}
