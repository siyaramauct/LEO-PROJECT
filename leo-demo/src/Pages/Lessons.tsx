import { BookOpen, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import { supabase } from "../supabase-client";
import { BROKEN_IMAGE_URL, bucketImageUrl } from "../utils/images";

interface Lesson {
  lesson_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
}

export default function Lessons() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("lesson_id, title, description, lesson_image_path")
        .lte("release_date", new Date().toISOString())
        .order("title", { ascending: true });
      if (error) {
        setErrorMessage("Could not load lessons. Please try again.");
      } else {
        setLessons(data ?? []);
      }
      setIsLoading(false);
    };

    void fetchLessons();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold">Lessons</h1>
              <p className="mt-1 text-xs text-slate-500">
                Choose a lesson to review its vocabulary.
              </p>
            </div>
            <NotificationBell />
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="rounded-xl bg-violet-700 p-5 text-white sm:flex sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-medium text-violet-100">Learning library</p>
              <h2 className="mt-2 text-xl font-bold">Build confidence one lesson at a time.</h2>
              <p className="mt-2 max-w-xl text-sm text-violet-100">
                Review core vocabulary, practise with flashcards, and complete a quiz when you are
                ready.
              </p>
            </div>
            <img
              src={bucketImageUrl("lessonImgs/businessEng.avif")}
              alt="English language study"
              className="mt-4 h-24 w-full rounded-lg object-cover sm:mt-0 sm:h-28 sm:w-40"
            />
          </section>
          {isLoading && (
            <p className="py-12 text-center text-sm text-slate-500">Loading lessons...</p>
          )}
          {errorMessage && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          {!isLoading && !errorMessage && (
            <section className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Available lessons</h2>
                <span className="text-sm text-slate-500">{lessons.length} lessons</span>
              </div>
              {lessons.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-12 text-center">
                  <BookOpen size={24} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold">No lessons are available yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your teacher’s lessons will appear here when they are ready.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lessons.map((lesson) => (
                    <button
                      key={lesson.lesson_id}
                      type="button"
                      onClick={() => navigate(`/lesson/${lesson.lesson_id}`)}
                      className="overflow-hidden rounded-xl border border-slate-100 bg-white text-left transition hover:border-violet-200 hover:shadow-sm"
                    >
                      <img
                        src={
                          lesson.lesson_image_path
                            ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path)
                                .data.publicUrl
                            : BROKEN_IMAGE_URL
                        }
                        alt={lesson.title}
                        className="h-36 w-full object-cover"
                      />
                      <div className="p-4">
                        <h3 className="truncate text-base font-bold">{lesson.title}</h3>
                        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                          {lesson.description ?? "Lesson"}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">
                          Open lesson <ChevronRight size={16} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
