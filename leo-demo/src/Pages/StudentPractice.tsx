import { Bell, BookOpen, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";
import { BROKEN_IMAGE_URL } from "../utils/images";

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

export default function StudentPractice() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const isLoading = Boolean(session?.user && loadedUserId !== session.user.id);

  useEffect(() => {
    if (!session?.user) return;

    const loadLessons = async () => {
      try {
        // Find all classrooms that this student belongs to
        const { data: enrolments, error: enrolmentError } = await supabase
          .from("classroom_students")
          .select("classroom_id")
          .eq("student_id", session.user.id);

        if (enrolmentError) {
          throw enrolmentError;
        }

        const classroomIds = (enrolments ?? []).map((enrolment) => enrolment.classroom_id);

        // Student is not enrolled in any classrooms
        if (classroomIds.length === 0) {
          setLessons([]);
          setClassrooms([]);
          setErrorMessage("");
          return;
        }

        // Get the student's classrooms
        const { data: classroomData, error: classroomError } = await supabase
          .from("classrooms")
          .select("classroom_id, classroom_name")
          .in("classroom_id", classroomIds)
          .order("classroom_name");

        if (classroomError) {
          throw classroomError;
        }

        setClassrooms(classroomData ?? []);

        // Get lessons belonging to those classrooms
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("lesson_id, classroom_id, title, description, lesson_image_path")
          .in("classroom_id", classroomIds)
          .lte("release_date", new Date().toISOString())
          .order("title");

        if (lessonError) {
          throw lessonError;
        }

        setLessons(lessonData ?? []);
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

  const getClassroomName = (classroomId: string) => {
    return (
      classrooms.find((classroom) => classroom.classroom_id === classroomId)?.classroom_name ??
      "Your classroom"
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />

      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>

              <h1 className="mt-1 text-xl font-bold">Practice</h1>

              <p className="mt-1 text-xs text-slate-500">
                Practise the lessons your teachers have shared with you.
              </p>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <Bell size={19} />
            </button>
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
                  <BookOpen size={24} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-sm font-semibold">No lessons are available yet</p>

                  <p className="mt-1 text-xs text-slate-500">
                    Your teacher's lessons will appear here when they are added to your classroom.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lessons.map((lesson) => {
                    const image = lesson.lesson_image_path
                      ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path).data
                          .publicUrl
                      : BROKEN_IMAGE_URL;

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
