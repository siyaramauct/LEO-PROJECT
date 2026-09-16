import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, ExternalLink, FileText, Link as LinkIcon, LogOut } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import DeleteAccountDialog from "../Components/DeleteAccountDialog";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import { supabase } from "../supabase-client";
import { useAuth } from "../../context/AuthContext";

type Classroom = { classroom_id: string; classroom_name: string; description: string | null; cover_image_path: string | null };
type Lesson = { lesson_id: string; title: string; description: string | null; lesson_image_path: string | null; created_at: string | null };
type Material = { resource_id: string; resource_type: "document" | "link"; resource_url: string; uploaded_date: string | null };

const imageUrl = (path: string | null, fallback: string) => path ? supabase.storage.from("images").getPublicUrl(path).data.publicUrl : fallback;
// `resource_url` stores the object key, for example:
// classroom_documents/AI_Workshop_RYNTIM003.pdf
// Keep that key unchanged when resolving the file from the documents bucket.
const documentUrl = (path: string | null) => {
  if (!path) return "#";

  // Older records may contain the complete public URL. In that case, use it
  // directly instead of passing the URL back to Storage as an object key.
  if (/^https?:\/\//i.test(path)) return path;

  return supabase.storage
    .from("documents")
    .getPublicUrl(path, { download: false })
    .data.publicUrl;
};
const documentFileName = (path: string) => {
  const storedFileName = decodeURIComponent(path.split("/").pop() || path);
  return storedFileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i, "");
};

// Documents have no title column, so the display name is derived from the storage path.
const materialTitle = (material: Material) => {
  if (material.resource_type === "link") {
    try { return new URL(material.resource_url).hostname; } catch { return material.resource_url; }
  }
  return documentFileName(material.resource_url);
};

export default function StudentClassroomDetail() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeavingClassroom, setIsLeavingClassroom] = useState(false);

  useEffect(() => {
    if (!session?.user || !classroomId) return;
    let isCurrent = true;

    const loadClassroom = async () => {
      setIsLoading(true);
      setError(null);
      const { data: enrolment, error: enrolmentError } = await supabase
        .from("classroom_students")
        .select("classroom_id")
        .eq("classroom_id", classroomId)
        .eq("student_id", session.user.id)
        .maybeSingle();

      if (enrolmentError) console.error("Failed to check classroom enrolment:", enrolmentError);
      if (enrolmentError || !enrolment) {
        if (isCurrent) setError("This classroom is unavailable.");
        if (isCurrent) setIsLoading(false);
        return;
      }

      const [classroomResult, lessonsResult, materialsResult] = await Promise.all([
        supabase.from("classrooms").select("classroom_id, classroom_name, description, cover_image_path").eq("classroom_id", classroomId).maybeSingle(),
        supabase.from("lessons").select("lesson_id, title, description, lesson_image_path, created_at").eq("classroom_id", classroomId).order("created_at", { ascending: false }),
        supabase.from("learning_resources").select("resource_id, resource_type, resource_url, uploaded_date").eq("classroom_id", classroomId).order("uploaded_date", { ascending: false }),
      ]);

      if (classroomResult.error) console.error("Failed to load classroom:", classroomResult.error);
      if (lessonsResult.error) console.error("Failed to load lessons:", lessonsResult.error);
      // Materials are a secondary feature, a missing/failed materials table should not block the rest of the page.
      if (materialsResult.error) console.error("Failed to load classroom materials:", materialsResult.error);

      if (classroomResult.error || lessonsResult.error || !classroomResult.data) {
        if (isCurrent) setError("Classroom information could not be loaded right now.");
        if (isCurrent) setIsLoading(false);
        return;
      }

      const classroomLessons = (lessonsResult.data ?? []) as Lesson[];
      const lessonIds = classroomLessons.map((lesson) => lesson.lesson_id);
      const { data: attempts, error: attemptsError } = lessonIds.length
        ? await supabase.from("lesson_attempts").select("lesson_id").eq("student_id", session.user.id).in("lesson_id", lessonIds).not("completed_at", "is", null)
        : { data: [], error: null };

      if (attemptsError) {
        console.error("Failed to load lesson progress:", attemptsError);
        if (isCurrent) setError("Lesson progress could not be loaded right now.");
      } else if (isCurrent) {
        setClassroom(classroomResult.data as Classroom);
        setLessons(classroomLessons);
        setMaterials(materialsResult.error ? [] : ((materialsResult.data ?? []) as Material[]));
        setCompletedLessonIds([...new Set((attempts ?? []).map((attempt) => attempt.lesson_id))]);
      }
      if (isCurrent) setIsLoading(false);
    };

    void loadClassroom();
    return () => { isCurrent = false; };
  }, [classroomId, session?.user]);

  const assignedLessons = lessons.filter((lesson) => !completedLessonIds.includes(lesson.lesson_id));
  const completedLessons = lessons.filter((lesson) => completedLessonIds.includes(lesson.lesson_id));
  const coverUrl = imageUrl(classroom?.cover_image_path ?? null, "/classRoomIllustration.png");

  // Removes the calling student's enrolment row so the classroom no longer appears for them.
  async function leaveClassroom() {
    if (!classroomId || !session?.user || isLeavingClassroom) return;
    setIsLeavingClassroom(true);
    const { error: leaveError } = await supabase
      .from("classroom_students")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("student_id", session.user.id);

    setIsLeavingClassroom(false);
    if (leaveError) {
      console.error("Failed to leave classroom:", leaveError);
      window.alert("You could not be removed from this classroom. Please try again.");
      return;
    }

    setIsLeaveDialogOpen(false);
    navigate("/student/classrooms");
  }

  if (isLoading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-500">Loading classroom...</p></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center"><p className="text-sm text-red-700">{error}</p></main>;

  const LessonList = ({ title, description, items, completed }: { title: string; description: string; items: Lesson[]; completed?: boolean }) => (
    <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="py-7 text-center text-sm text-slate-500">
          {completed ? "Completed lessons will appear here." : "There are no lessons waiting for you."}
        </p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {items.map((lesson) => (
            <Link
              key={lesson.lesson_id}
              to={`/lesson/${lesson.lesson_id}`}
              className="flex items-center gap-3 py-3 transition hover:bg-slate-50"
            >
              <img src={imageUrl(lesson.lesson_image_path, "/Level1.png")} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{lesson.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{lesson.description ?? "Vocabulary practice"}</span>
              </span>
              {completed ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <ChevronRight size={18} className="shrink-0 text-slate-400" />}
            </Link>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/student/classrooms" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100">
                <ArrowLeft size={19} />
              </Link>
              <div>
                <p className="text-xs font-medium text-violet-700">Student portal</p>
                <h1 className="mt-1 text-xl font-bold">Classroom overview</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                <LogOut size={15} /> Leave classroom
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white sm:p-6">
            <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-40 h-20 w-32 rounded-t-full bg-white/10" />
            <img src={coverUrl} alt={classroom?.classroom_name ?? "Classroom"} className="absolute inset-y-0 right-0 w-36 object-cover opacity-90 sm:w-52" />
            <div className="relative max-w-2xl pr-28 sm:pr-44">
              <p className="text-xs font-medium text-violet-100">Your classroom</p>
              <h2 className="mt-2 text-2xl font-bold">{classroom?.classroom_name}</h2>
              {classroom?.description && <p className="mt-2 text-sm text-violet-100">{classroom.description}</p>}
              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-violet-100">
                <span className="inline-flex items-center gap-1.5"><BookOpen size={15} />{lessons.length} lessons</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} />{completedLessons.length} completed</span>
                <span className="inline-flex items-center gap-1.5"><Clock size={15} />{assignedLessons.length} to do</span>
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-4">
            <LessonList title="Assigned lessons" description="New lessons shared by your teacher." items={assignedLessons} />
            <LessonList title="Completed lessons" description="Lessons you have finished in this classroom." items={completedLessons} completed />

            <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Learning resources</h2>
                  <p className="mt-1 text-sm text-slate-500">Files and links shared by your teacher.</p>
                </div>
                <FileText size={19} className="text-violet-700" />
              </div>
              {materials.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No resources have been shared yet.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {materials.map((material) => {
                    const href = material.resource_type === "link" ? material.resource_url : documentUrl(material.resource_url);
                    const Icon = material.resource_type === "link" ? LinkIcon : FileText;
                    return (
                      <a
                        key={material.resource_id}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-3 transition hover:bg-slate-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{materialTitle(material)}</span>
                          <span className="mt-1 block text-xs text-slate-500">{material.resource_type === "link" ? "External link" : "Document"}</span>
                        </span>
                        <ExternalLink size={16} className="shrink-0 text-slate-400" />
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <DeleteAccountDialog
        open={isLeaveDialogOpen}
        isDeleting={isLeavingClassroom}
        onCancel={() => setIsLeaveDialogOpen(false)}
        onConfirm={() => void leaveClassroom()}
        title={`Leave ${classroom?.classroom_name ?? "this classroom"}?`}
        description="You will lose access to its lessons and materials. Your teacher can re-add you later using your username."
        confirmLabel="Leave classroom"
        deletingLabel="Leaving..."
      />
    </div>
  );
}