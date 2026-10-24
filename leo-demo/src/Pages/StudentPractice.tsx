// -----------------------------------------------------------------------------
// Student Practice
//
// Every released lesson across the student's classrooms, as cards with a
// "Start Practice" button. Opened from the raised Practice button in the
// student navigation.
//
// Route: /student/practice || Access: students
// -----------------------------------------------------------------------------

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { getReleasedLessons } from "../data/lessons";
import { getEnrolledClassrooms } from "../services/classroomService";
import { bucketImageUrlOrBroken } from "../utils/images";

// -- Types --------------------------------------------------------------------

type Lesson = {
  lesson_id: string;
  classroom_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
};

type Classroom = {
  classroom_id: string;
  classroom_name: string;
};

// -- Page ---------------------------------------------------------------------

export default function StudentPractice() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Loading until data has been fetched for the signed-in user.
  const isLoading = Boolean(session?.user && loadedUserId !== session.user.id);

  // The student's classrooms (classroomService), then their released lessons.

  useEffect(() => {
    if (!session?.user) return;

    const loadLessons = async () => {
      try {
        const enrolledClassrooms = await getEnrolledClassrooms(session.user.id);
        const classroomIds = enrolledClassrooms.map((classroom) => classroom.classroom_id);

        if (classroomIds.length === 0) {
          setLessons([]);
          setClassrooms([]);
          setErrorMessage("");
          return;
        }

        setClassrooms(enrolledClassrooms);

        setLessons(await getReleasedLessons(classroomIds, { order: "title" }));
        setErrorMessage("");
      } catch (error) {
        console.error("Error loading student lessons:", error);
        setErrorMessage("We could not load your lessons. Please try again.");
      } finally {
        setLoadedUserId(session.user.id);
      }
    };

    void loadLessons();
  }, [session?.user]);

  const getClassroomName = (classroomId: string) =>
    classrooms.find((classroom) => classroom.classroom_id === classroomId)?.classroom_name ??
    "Your classroom";

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />

      <main className="min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>

              <h1 className="mt-1 text-xl font-bold">Practice</h1>

              <p className="mt-1 text-xs text-slate-500">
                Practise the lessons your teachers have shared with you.
              </p>
            </div>

            <NotificationBell />
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="rounded-xl bg-violet-700 p-5 text-white sm:p-6">
            <p className="text-xs font-medium text-violet-100">Your learning</p>

            <h2 className="mt-2 text-xl font-bold">Choose a lesson to practise</h2>

            <p className="mt-2 max-w-xl text-sm text-violet-100">
              These are the lessons that your teachers have made available through your classrooms.
            </p>
          </section>

          {isLoading && (
            <p className="py-12 text-center text-sm text-slate-500">Loading your lessons...</p>
          )}

          {errorMessage && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && (
            <section className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">Available lessons</h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {lessons.length} lesson
                    {lessons.length === 1 ? "" : "s"} available
                  </p>
                </div>
              </div>

              {lessons.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-12 text-center">
                  <p className="text-sm font-semibold">No lessons are available yet</p>

                  <p className="mt-1 text-xs text-slate-500">
                    Your teacher's lessons will appear here when they are added to your classroom.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lessons.map((lesson) => {
                    const image = bucketImageUrlOrBroken(lesson.lesson_image_path);

                    return (
                      <article
                        key={lesson.lesson_id}
                        className="overflow-hidden rounded-xl border border-slate-100 bg-white"
                      >
                        <img src={image} alt="" className="h-36 w-full object-cover" />

                        <div className="p-4">
                          <p className="text-xs font-medium text-violet-700">
                            {getClassroomName(lesson.classroom_id)}
                          </p>

                          <h3 className="mt-1 truncate text-base font-bold">{lesson.title}</h3>

                          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                            {lesson.description ?? "Practise the vocabulary from this lesson."}
                          </p>

                          <button
                            type="button"
                            onClick={() => navigate(`/lesson/${lesson.lesson_id}`)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
                          >
                            Start Practice
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
