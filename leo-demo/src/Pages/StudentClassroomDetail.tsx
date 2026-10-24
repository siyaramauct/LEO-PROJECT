// -----------------------------------------------------------------------------
// Student Classroom Detail
//
// One classroom from the student's side: a banner with lesson counts, the
// lessons still to do, completed lessons with their latest score, and the
// files and links the teacher has shared. The student can also leave the
// classroom from here.
//
// The page first checks the student is enrolled, so a shared or guessed link
// to someone else's classroom shows "unavailable" instead of its content.
//
// Route: /student/classrooms/:classroomId || Access: students
// -----------------------------------------------------------------------------

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BannerDescription from "../Components/BannerDescription";
import ConfirmDialog from "../Components/ConfirmDialog";
import { MaterialSpine, MaterialTypeTag } from "../Components/MaterialTypeMarks";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { type ClassroomSummary } from "../data/classrooms";
import { errorMessage } from "../data/errors";
import { materialUrl, type Material } from "../data/materials";
import {
  getStudentClassroom,
  leaveClassroom,
  studentDisplayName,
  type StudentClassroomLesson,
} from "../services/classroomService";
import { bucketImageUrlOrBroken } from "../utils/images";
import { materialTypeLabel } from "../utils/materialFileTypes";

// -- Types --------------------------------------------------------------------

type Classroom = ClassroomSummary;
type Lesson = StudentClassroomLesson;

// -- Material helpers ---------------------------------------------------------

// Uploaded files are stored as "<uuid>-<name>"; show just the name.
const documentFileName = (path: string) => {
  const storedFileName = decodeURIComponent(path.split("/").pop() || path);
  return storedFileName.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i,
    "",
  );
};

// Materials have no title column: links show their website, documents their file name.
const materialTitle = (material: Material) => {
  if (material.resource_type === "link") {
    try {
      return new URL(material.resource_url).hostname;
    } catch {
      return material.resource_url;
    }
  }
  return documentFileName(material.resource_url);
};

// -- Lesson list --------------------------------------------------------------

// One card listing lessons. The right-hand marker depends on the lesson:
//   flashcards-only lesson     a "Flashcards only" tag (an arrow on phones)
//   completed with a score     "score / total" (and the percentage from sm up)
//   completed without a score  a tick
//   not yet done               an arrow
const LessonList = ({
  title,
  description,
  items,
  completed,
}: {
  title: string;
  description: string;
  items: Lesson[];
  completed?: boolean;
}) => (
  <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
    {items.length === 0 ? (
      <p className="py-7 text-center text-sm text-slate-500">
        {completed
          ? "Completed lessons will appear here."
          : "There are no lessons waiting for you."}
      </p>
    ) : (
      <div className="mt-3 divide-y divide-slate-100">
        {items.map((lesson) => (
          <Link
            key={lesson.lesson_id}
            to={`/lesson/${lesson.lesson_id}`}
            className="flex items-center gap-3 py-3 transition hover:bg-slate-50"
          >
            <img
              src={bucketImageUrlOrBroken(lesson.lesson_image_path)}
              alt=""
              className="h-12 w-16 shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {lesson.title}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {lesson.description ?? "Vocabulary practice"}
              </span>
            </span>
            {!lesson.hasQuiz ? (
              <>
                {/* Phones show a plain arrow; the tag squeezes the row there. */}
                <ChevronRight size={18} className="shrink-0 text-slate-400 sm:hidden" />
                <span className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 sm:flex">
                  <Layers size={9} /> Flashcards only
                </span>
              </>
            ) : completed ? (
              lesson.score !== null && lesson.totalQuestions ? (
                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-bold text-violet-700 sm:gap-3">
                  <span>
                    {lesson.score} / {lesson.totalQuestions}
                  </span>
                  <span className="hidden sm:inline">{lesson.percentage}%</span>
                </span>
              ) : (
                <CheckCircle2 size={18} className="shrink-0 text-violet-700" />
              )
            ) : (
              <ChevronRight size={18} className="shrink-0 text-slate-400" />
            )}
          </Link>
        ))}
      </div>
    )}
  </section>
);

// -- Page ---------------------------------------------------------------------

export default function StudentClassroomDetail() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeavingClassroom, setIsLeavingClassroom] = useState(false);

  // -- Load the classroom --
  // classroomService checks the student is enrolled, then loads the classroom,
  // its released lessons with the student's progress, and its materials.
  useEffect(() => {
    if (!session?.user || !classroomId) return;
    let isCurrent = true;

    const loadClassroom = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getStudentClassroom(session.user.id, classroomId);

        if (!isCurrent) return;

        setClassroom(result.classroom);
        setMaterials(result.materials);
        setLessons(result.lessons);
        setCompletedLessonIds(
          result.lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.lesson_id),
        );
      } catch (loadError) {
        console.error("Failed to load classroom:", loadError);

        if (isCurrent) {
          setError(errorMessage(loadError, "Classroom information could not be loaded right now."));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadClassroom();
    return () => {
      isCurrent = false;
    };
  }, [classroomId, session?.user]);

  // -- Derived values --

  const assignedLessons = lessons.filter(
    (lesson) => !completedLessonIds.includes(lesson.lesson_id),
  );
  const completedLessons = lessons.filter((lesson) =>
    completedLessonIds.includes(lesson.lesson_id),
  );
  const flashcardOnlyCount = lessons.filter((lesson) => !lesson.hasQuiz).length;
  const toDoCount = assignedLessons.length;
  const coverUrl = bucketImageUrlOrBroken(classroom?.cover_image_path);

  // -- Leave the classroom --
  // Runs after the student confirms. classroomService removes the enrolment
  // and tells the teacher; then the student returns to the classroom list.
  async function handleLeave() {
    if (!classroomId || !session?.user || isLeavingClassroom) return;
    setIsLeavingClassroom(true);
    try {
      await leaveClassroom({
        studentId: session.user.id,
        studentName: studentDisplayName(profile, session.user.email),
        classroomId,
        classroomName: classroom?.classroom_name ?? "this classroom",
      });
    } catch (leaveError) {
      console.error("Failed to leave classroom:", leaveError);
      setIsLeavingClassroom(false);
      window.alert(
        errorMessage(leaveError, "You could not leave this classroom. Please try again."),
      );
      return;
    }

    setIsLeaveDialogOpen(false);
    setIsLeavingClassroom(false);
    navigate("/student/classrooms");
  }

  // -- Loading and error screens --

  if (isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading classroom...</p>
      </main>
    );
  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-sm text-red-700">{error}</p>
      </main>
    );

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/student/classrooms"
                aria-label="Back to classrooms"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              >
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
                aria-label="Leave classroom"
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Leave classroom</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white sm:p-6">
            <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-40 h-20 w-32 rounded-t-full bg-white/10" />
            <img
              src={coverUrl}
              alt={classroom?.classroom_name ?? "Classroom"}
              className="absolute inset-y-0 right-0 w-36 object-cover opacity-90 sm:w-52"
            />
            <div className="relative max-w-2xl pr-28 sm:pr-44">
              <p className="text-xs font-medium text-violet-100">Your classroom</p>
              <h2 className="mt-2 text-2xl font-bold">{classroom?.classroom_name}</h2>
              {/* The cover picture leaves a narrow column on phones and tablets,
                  so long descriptions stop at three lines there, with Read more. */}
              {classroom?.description && (
                <BannerDescription
                  text={classroom.description}
                  className="mt-2 text-sm text-violet-100"
                />
              )}
              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-violet-100">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen size={15} />
                  {lessons.length} lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  {completedLessons.length} completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} />
                  {toDoCount} to do
                </span>
                {flashcardOnlyCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Layers size={15} />
                    {flashcardOnlyCount} flashcards only
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-4">
            <LessonList
              title="Assigned lessons"
              description="New lessons shared by your teacher."
              items={assignedLessons}
            />
            <LessonList
              title="Completed lessons"
              description="Lessons you have finished in this classroom."
              items={completedLessons}
              completed
            />

            <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Learning resources</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Files and links shared by your teacher.
                  </p>
                </div>
                <FileText size={19} className="text-violet-700" />
              </div>
              {materials.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No resources have been shared yet.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {materials.map((material) => {
                    const href = materialUrl(material);
                    const isLink = material.resource_type === "link";
                    const Icon = isLink ? LinkIcon : FileText;
                    return (
                      <a
                        key={material.resource_id}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-3 transition hover:bg-slate-50"
                      >
                        <MaterialSpine isLink={isLink} />
                        <Icon size={16} className="shrink-0 text-violet-700" />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800">
                              {materialTitle(material)}
                            </span>
                            <MaterialTypeTag
                              label={materialTypeLabel(
                                material.resource_type,
                                material.resource_url,
                              )}
                            />
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {material.resource_type === "link" ? "External link" : "Document"}
                          </span>
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

      <ConfirmDialog
        open={isLeaveDialogOpen}
        isDeleting={isLeavingClassroom}
        onCancel={() => setIsLeaveDialogOpen(false)}
        onConfirm={() => void handleLeave()}
        title={`Leave ${classroom?.classroom_name ?? "this classroom"}?`}
        description="You will lose access to its lessons and materials. You can rejoin later with the classroom code."
        confirmLabel="Leave classroom"
        deletingLabel="Leaving..."
      />
    </div>
  );
}
