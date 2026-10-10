// -----------------------------------------------------------------------------
// Classroom Detail (teacher)
//
// One classroom from the teacher's side. Everything about the classroom is
// managed here: its lessons, the files and links shared with students, the
// invite code, and the student roster.
//
// Phones and tablets (under 1024px): one scrolling page with a banner, the
// materials list, the invite code with the roster, and the lessons. On tablets
// the materials and invite panels sit side by side.
//
// Desktop (1024px and up): a banner with an "Invite students" popover, then
// three tabs: Lessons, Classroom material and Students. The open tab is kept
// in the URL (?tab=materials) so refreshing or sharing the link keeps it.
//
// Popups on this page:
//   ConfirmDialog       before deleting a lesson or material, or removing a student
//   Invite popover      opens under the banner; closes on an outside click,
//                       the Escape key or its X button
//
// Route: /teacher-classroom/:classroomId || Access: teachers
// -----------------------------------------------------------------------------

import { ArrowLeft, BookOpen, FolderOpen, Plus, UserPlus, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ClassroomInvitePanel, { type StudentProfile } from "../Components/ClassroomInvitePanel";
import ClassroomLessonRow, { type ClassroomLesson } from "../Components/ClassroomLessonRow";
import ClassroomMaterialsPanel, {
  type ClassroomMaterial,
} from "../Components/ClassroomMaterialsPanel";
import ClassroomMaterialsTimeline from "../Components/ClassroomMaterialsTimeline";
import ClassroomStudentsTab from "../Components/ClassroomStudentsTab";
import ClassroomTabs, { ClassroomTabPanel } from "../Components/ClassroomTabs";
import ConfirmDialog from "../Components/ConfirmDialog";
import { EmptyLessons, EmptyMaterials } from "../Components/EmptyClassroomContent";
import NotificationBell from "../Components/NotificationBell";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";
import UserIdentity from "../Components/UserIdentity";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";
import { bucketImageUrlOrBroken } from "../utils/images";
import { validateMaterialFile } from "../utils/materialFileTypes";
import { notifyClassroomStudents, notifyUser } from "../utils/notifications";

// -- Types --------------------------------------------------------------------

type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
};

type LessonRow = {
  lesson_id: string;
  title: string;
  lesson_image_path: string | null;
  release_date: string;
};

type MaterialRow = {
  resource_id: string;
  resource_type: "document" | "link";
  resource_url: string;
  uploaded_date: string;
};

type DesktopTab = "lessons" | "materials" | "students";
const DESKTOP_TABS: DesktopTab[] = ["lessons", "materials", "students"];

// -- Display helpers ----------------------------------------------------------

// Materials have no title column: links show their website, documents their
// file name without the "<uuid>-" prefix added on upload.
const materialTitle = (row: MaterialRow) => {
  if (row.resource_type === "link") {
    try {
      return new URL(row.resource_url).hostname;
    } catch {
      return row.resource_url;
    }
  }
  const segments = row.resource_url.split("/");
  return decodeURIComponent(segments[segments.length - 1] || row.resource_url).replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i,
    "",
  );
};

// Links open as they are; documents open from the documents bucket.
const materialUrl = (row: MaterialRow) =>
  row.resource_type === "link" || /^https?:\/\//i.test(row.resource_url)
    ? row.resource_url
    : supabase.storage.from("documents").getPublicUrl(row.resource_url).data.publicUrl;

const toMaterialDisplay = (row: MaterialRow): ClassroomMaterial => ({
  id: row.resource_id,
  title: materialTitle(row),
  kind: row.resource_type === "link" ? "Link" : "Document",
  detail: row.resource_type === "link" ? "External link" : "Shared document",
  resourceType: row.resource_type,
  resourcePath: row.resource_url,
  url: materialUrl(row),
  uploadedDate: row.uploaded_date,
});

// One flashcard is one word. Lessons with a release date ahead are "Scheduled".
const toLessonDisplay = (row: LessonRow, hasQuiz: boolean, words: number): ClassroomLesson => ({
  id: row.lesson_id,
  title: row.title,
  image: bucketImageUrlOrBroken(row.lesson_image_path),
  imageAlt: row.title,
  status: new Date(row.release_date) > new Date() ? "Scheduled" : "Published",
  words,
  completion: 0,
  hasQuiz,
});

// -- Page ---------------------------------------------------------------------

export default function ClassroomDetail() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();
  const teacherId = session?.user?.id;
  const [classroom, setClassroom] = useState<ClassroomRow | null>(null);
  const [lessons, setLessons] = useState<ClassroomLesson[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterial[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [enrolledAt, setEnrolledAt] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const invitePopoverRef = useRef<HTMLDivElement>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [isRotatingCode, setIsRotatingCode] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<ClassroomLesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<StudentProfile | null>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<ClassroomMaterial | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // -- Load the classroom --
  //
  // 1. In parallel: the classroom, its lessons, enrolments, shared materials
  //    and the private invite code.
  // 2. For the lessons: which have a quiz, and how many flashcards each has.
  // 3. For the enrolments: the students' profiles.
  useEffect(() => {
    if (!classroomId || !teacherId) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [classroomResult, lessonsResult, enrollmentResult, materialsResult, inviteResult] =
        await Promise.all([
          supabase
            .from("classrooms")
            .select("classroom_id, classroom_name, description, cover_image_path")
            .eq("classroom_id", classroomId)
            .single(),
          supabase
            .from("lessons")
            .select("lesson_id, title, lesson_image_path, release_date")
            .eq("classroom_id", classroomId),
          supabase
            .from("classroom_students")
            .select("student_id, enrolled_at")
            .eq("classroom_id", classroomId),
          supabase
            .from("learning_resources")
            .select("resource_id, resource_type, resource_url, uploaded_date")
            .eq("classroom_id", classroomId)
            .is("lesson_id", null)
            .order("uploaded_date", { ascending: false }),
          supabase.rpc("get_classroom_invite_code", { p_classroom_id: classroomId }),
        ]);

      setInviteCode(inviteResult.data ?? null);
      setInviteCodeError(
        inviteResult.error ? `Could not load invitation code: ${inviteResult.error.message}` : null,
      );

      if (classroomResult.error) {
        console.error("Failed to load classroom:", classroomResult.error);
        setLoadError(`Could not load this classroom: ${classroomResult.error.message}`);
      } else if (!classroomResult.data) {
        setLoadError("This classroom no longer exists or is unavailable.");
      } else {
        setClassroom(classroomResult.data as ClassroomRow);
      }

      if (!lessonsResult.error && lessonsResult.data) {
        const lessonRows = lessonsResult.data as LessonRow[];
        const lessonIds = lessonRows.map((row) => row.lesson_id);
        const noRows = { data: [], error: null };

        const [mcqResult, flashcardResult] = lessonIds.length
          ? await Promise.all([
              supabase.from("mcqs").select("lesson_id").in("lesson_id", lessonIds),
              supabase.from("flashcards").select("lesson_id").in("lesson_id", lessonIds),
            ])
          : [noRows, noRows];
        if (mcqResult.error) console.error("Failed to load lesson quizzes:", mcqResult.error);
        if (flashcardResult.error) {
          console.error("Failed to load lesson word counts:", flashcardResult.error);
        }

        // Lessons without an mcqs row are flashcards-only. If that lookup
        // failed, assume a quiz rather than mislabel them.
        const quizLessonIds = new Set((mcqResult.data ?? []).map((mcq) => mcq.lesson_id as string));
        const wordCounts: Record<string, number> = {};
        for (const card of flashcardResult.data ?? []) {
          wordCounts[card.lesson_id] = (wordCounts[card.lesson_id] ?? 0) + 1;
        }

        setLessons(
          lessonRows.map((row) =>
            toLessonDisplay(
              row,
              Boolean(mcqResult.error) || quizLessonIds.has(row.lesson_id),
              wordCounts[row.lesson_id] ?? 0,
            ),
          ),
        );
      }

      if (!materialsResult.error) {
        setMaterials(((materialsResult.data ?? []) as MaterialRow[]).map(toMaterialDisplay));
      }

      if (enrollmentResult.error) {
        console.error("Failed to load enrolled students:", enrollmentResult.error);
        setEnrollmentError(`Could not load enrolled students: ${enrollmentResult.error.message}`);
      } else {
        const studentIds = enrollmentResult.data.map((enrollment) => enrollment.student_id);
        setEnrolledStudentIds(studentIds);
        setEnrolledAt(
          Object.fromEntries(
            enrollmentResult.data.map((enrollment) => [
              enrollment.student_id,
              enrollment.enrolled_at,
            ]),
          ),
        );
        if (studentIds.length) {
          const { data: enrolledProfiles, error: enrolledProfilesError } = await supabase
            .from("profiles")
            .select("id, name, surname, username, user_role")
            .in("id", studentIds);
          if (enrolledProfilesError) {
            console.error("Failed to load enrolled student profiles:", enrolledProfilesError);
            setEnrollmentError(
              `Students are enrolled, but their profiles could not be loaded: ${enrolledProfilesError.message}`,
            );
          } else {
            setStudentProfiles((enrolledProfiles ?? []) as StudentProfile[]);
          }
        } else {
          setStudentProfiles([]);
        }
      }

      setIsLoading(false);
    };

    void load();
  }, [classroomId, teacherId]);

  const enrolledStudents = studentProfiles.filter((student) =>
    enrolledStudentIds.includes(student.id),
  );

  // -- Desktop tabs --
  // The open tab lives in the URL, so refresh, back navigation and shared
  // links keep it. "lessons" is the default and leaves the URL clean.
  const requestedTab = searchParams.get("tab") as DesktopTab | null;
  const activeTab: DesktopTab =
    requestedTab && DESKTOP_TABS.includes(requestedTab) ? requestedTab : "lessons";
  const selectTab = (tab: DesktopTab) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (tab === "lessons") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  // -- Invite popover --
  // While open, a click anywhere outside the banner area or the Escape key
  // closes it. The listeners are removed again when it closes.
  useEffect(() => {
    if (!isInviteOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!invitePopoverRef.current?.contains(event.target as Node)) setIsInviteOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsInviteOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isInviteOpen]);

  // Replaces the invite code; the old one stops working straight away.
  async function rotateInviteCode() {
    if (
      !classroomId ||
      isRotatingCode ||
      !window.confirm("Create a new classroom code? The old code will stop working.")
    )
      return;
    setIsRotatingCode(true);
    setInviteCodeError(null);
    const { data, error } = await supabase.rpc("rotate_classroom_invite_code", {
      p_classroom_id: classroomId,
    });
    setIsRotatingCode(false);
    if (error || !data) {
      setInviteCodeError(error?.message ?? "Could not create a new code.");
      return;
    }
    setInviteCode(data);
  }

  // -- Materials --

  // Uploads a file to the documents bucket, records it as a classroom
  // material, then tells the students.
  const addFile = async (file: File) => {
    if (!classroomId || !teacherId) return;
    const validation = validateMaterialFile(file);
    if ("error" in validation) {
      setMaterialError(validation.error);
      return;
    }
    setIsSavingMaterial(true);
    setMaterialError(null);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    // Storage "folders" are just path prefixes. The random id stops a second
    // upload with the same name overwriting a file another row still uses.
    const storagePath = `classroom_documents/${classroomId}/${crypto.randomUUID()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: validation.contentType,
        upsert: false,
      });
    if (uploadError) {
      console.error("Document storage upload failed:", uploadError);
      setMaterialError(`The document could not be uploaded: ${uploadError.message}`);
      setIsSavingMaterial(false);
      return;
    }
    const { data, error } = await supabase
      .from("learning_resources")
      .insert({
        classroom_id: classroomId,
        resource_type: "document",
        resource_url: storagePath,
      })
      .select("resource_id, resource_type, resource_url, uploaded_date")
      .single();
    setIsSavingMaterial(false);
    if (error || !data) {
      console.error("Learning resource insert failed:", error);
      setMaterialError(
        `The document was uploaded but could not be shared: ${error?.message ?? "No resource was returned."}`,
      );
      return;
    }
    setMaterials((prev) => [toMaterialDisplay(data as MaterialRow), ...prev]);
    await notifyClassroomStudents(classroomId, {
      type: "new_material",
      title: "New classroom material",
      body: `Your teacher shared "${file.name}" in "${classroom?.classroom_name ?? "your classroom"}".`,
      link_url: `/student/classrooms/${classroomId}`,
    });
  };

  // Shares a web link with the class. Only http and https addresses are
  // accepted; "example.com" is treated as "https://example.com".
  const addLink = async (url: string) => {
    if (!classroomId || !teacherId) return;
    setMaterialError(null);

    const externalUrl = url.includes("://") ? url : `https://${url}`;
    try {
      const { protocol } = new URL(externalUrl);
      if (protocol !== "http:" && protocol !== "https:") throw new Error("Unsupported link");
    } catch {
      setMaterialError("Enter a web address that starts with http:// or https://.");
      return;
    }

    setIsSavingMaterial(true);
    const { data, error } = await supabase
      .from("learning_resources")
      .insert({
        classroom_id: classroomId,
        resource_type: "link",
        resource_url: externalUrl,
      })
      .select("resource_id, resource_type, resource_url, uploaded_date")
      .single();
    setIsSavingMaterial(false);
    if (error || !data) {
      setMaterialError("The link could not be shared with learners. Please try again.");
      return;
    }
    setMaterials((prev) => [toMaterialDisplay(data as MaterialRow), ...prev]);
    await notifyClassroomStudents(classroomId, {
      type: "new_material",
      title: "New classroom material",
      body: `Your teacher shared a link in "${classroom?.classroom_name ?? "your classroom"}".`,
      link_url: `/student/classrooms/${classroomId}`,
    });
  };

  // -- Confirmed deletions (each runs after its ConfirmDialog) --

  const deleteLesson = async () => {
    if (!lessonToDelete) return;

    setIsDeletingLesson(true);
    setLoadError(null);

    const { error } = await supabase.from("lessons").delete().eq("lesson_id", lessonToDelete.id);

    setIsDeletingLesson(false);
    if (error) {
      setLoadError(`Could not delete lesson: ${error.message}`);
      return;
    }

    setLessons((currentLessons) =>
      currentLessons.filter((lesson) => lesson.id !== lessonToDelete.id),
    );
    setLessonToDelete(null);
  };

  const removeStudent = async () => {
    if (!classroomId || !studentToRemove) return;

    setIsRemovingStudent(true);
    setEnrollmentError(null);

    const { error } = await supabase
      .from("classroom_students")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("student_id", studentToRemove.id);

    setIsRemovingStudent(false);
    if (error) {
      setEnrollmentError(`Could not remove this student: ${error.message}`);
      return;
    }

    setStudentProfiles((students) =>
      students.filter((student) => student.id !== studentToRemove.id),
    );
    setEnrolledStudentIds((studentIds) => studentIds.filter((id) => id !== studentToRemove.id));
    await notifyUser({
      recipient_id: studentToRemove.id,
      type: "removed_from_classroom",
      title: "You were removed from a classroom",
      body: `You were removed from "${classroom?.classroom_name ?? "a classroom"}".`,
      link_url: "/student/classrooms",
    });
    setStudentToRemove(null);
  };

  // Removes the stored file first (if any), then the material row.
  const deleteMaterial = async () => {
    if (!materialToDelete) return;

    setIsDeletingMaterial(true);
    setMaterialError(null);

    if (materialToDelete.resourceType === "document") {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([materialToDelete.resourcePath]);
      if (storageError) console.error("Failed to delete document from storage:", storageError);
    }

    const { error } = await supabase
      .from("learning_resources")
      .delete()
      .eq("resource_id", materialToDelete.id);

    setIsDeletingMaterial(false);
    if (error) {
      setMaterialError(`Could not delete this material: ${error.message}`);
      return;
    }

    setMaterials((prev) => prev.filter((material) => material.id !== materialToDelete.id));
    setMaterialToDelete(null);
  };

  // -- Derived values --

  const coverUrl = bucketImageUrlOrBroken(classroom?.cover_image_path);

  const classroomName = classroom?.classroom_name ?? "Classroom";
  const description = classroom?.description ?? "";
  const studentCount = enrolledStudentIds.length;
  const lessonCount = lessons.length;

  // -- Loading and error screens --

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading classroom...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {
        // -- Phone and tablet layout (under 1024px) --
      }
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link
            to="/TeacherClassroom"
            aria-label="Back to classrooms"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </Link>
          <NotificationBell />
        </header>

        <main className="px-4 pb-5 sm:px-6">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-8 h-11 w-24 rounded-t-full bg-white/10" />
            <div className="absolute inset-y-0 right-0 w-28 overflow-hidden bg-white">
              <img
                src={coverUrl}
                alt={classroomName}
                className="block h-full w-full object-cover"
              />
            </div>
            <p className="relative z-10 pr-28 text-xs font-medium text-white">Classroom</p>
            <div className="relative z-10 mt-3 pr-28">
              <h1 className="text-xl font-bold">{classroomName}</h1>
              {description && <p className="mt-1 text-xs text-white/80">{description}</p>}
            </div>
          </section>

          <div className="md:grid md:grid-cols-2 md:items-start md:gap-3">
            <div className="mt-3">
              <ClassroomMaterialsPanel
                materials={materials}
                onFileUpload={addFile}
                onAddLink={addLink}
                onDeleteMaterial={setMaterialToDelete}
                isSaving={isSavingMaterial}
                error={materialError}
              />
              {materials.length === 0 && <EmptyMaterials />}
            </div>

            <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
              <ClassroomInvitePanel
                classroomName={classroomName}
                code={inviteCode}
                codeError={inviteCodeError}
                students={enrolledStudents}
                enrolledAt={enrolledAt}
                rosterError={enrollmentError}
                isRotating={isRotatingCode}
                onRotate={() => void rotateInviteCode()}
              />
            </section>
          </div>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Lessons</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Link
                to={`/create-lesson?classroomId=${classroomId}`}
                className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"
              >
                <Plus size={14} /> Lesson
              </Link>
            </div>
            {lessons.length === 0 ? (
              <EmptyLessons />
            ) : (
              <div className="mt-2">
                {lessons.map((lesson) => (
                  <ClassroomLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    onDelete={setLessonToDelete}
                    onOpen={(openedLesson) =>
                      navigate(`/teacher-classroom/${classroomId}/lesson/${openedLesson.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <TeacherBottomNav active="classes" />
      </div>

      {
        // -- Desktop layout (1024px and up) --
      }
      <div className="hidden min-h-dvh lg:flex">
        <TeacherSidebar active="classes" />

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/TeacherClassroom"
                aria-label="Back to classrooms"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft size={19} />
              </Link>
              <div>
                <p className="text-xs font-medium text-violet-700">Teacher Portal</p>
                <h1 className="mt-1 text-xl font-bold">Classroom overview</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserIdentity />
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl p-5">
            <div ref={invitePopoverRef} className="relative">
              <section className="relative flex items-center justify-between gap-6 overflow-hidden rounded-xl bg-violet-700 p-5 text-white">
                <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
                <div className="absolute bottom-0 right-48 h-20 w-32 rounded-t-full bg-white/10" />
                <div className="relative min-w-0">
                  <p className="text-xs font-medium text-white">Active classroom</p>
                  <h2 className="mt-2 text-2xl font-bold">{classroomName}</h2>
                  {description && (
                    <p className="mt-2 max-w-2xl text-sm text-white/80">{description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold text-white">
                      {studentCount} student{studentCount !== 1 ? "s" : ""} · {lessonCount} lesson
                      {lessonCount !== 1 ? "s" : ""} · {materials.length} material
                      {materials.length !== 1 ? "s" : ""}
                    </p>
                    <button
                      type="button"
                      aria-expanded={isInviteOpen}
                      aria-haspopup="dialog"
                      onClick={() => setIsInviteOpen((isOpen) => !isOpen)}
                      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      <UserPlus size={14} /> Invite students
                    </button>
                  </div>
                </div>
                <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm">
                  <img
                    src={coverUrl}
                    alt={classroomName}
                    className="block h-full w-full object-cover"
                  />
                </div>
              </section>

              {isInviteOpen && (
                <div
                  role="dialog"
                  aria-label="Invite students"
                  className="absolute left-5 top-full z-20 mt-2 w-[26rem] max-w-[calc(100%-2.5rem)] rounded-xl border border-slate-100 bg-white p-4 shadow-lg"
                >
                  <button
                    type="button"
                    aria-label="Close invite"
                    onClick={() => setIsInviteOpen(false)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X size={16} />
                  </button>
                  <ClassroomInvitePanel
                    classroomName={classroomName}
                    code={inviteCode}
                    codeError={inviteCodeError}
                    isRotating={isRotatingCode}
                    onRotate={() => void rotateInviteCode()}
                  />
                </div>
              )}
            </div>

            <div className="mt-5">
              <ClassroomTabs
                label="Classroom sections"
                active={activeTab}
                onChange={selectTab}
                tabs={[
                  {
                    id: "lessons",
                    label: "Lessons",
                    icon: <BookOpen size={16} />,
                    count: lessonCount,
                  },
                  {
                    id: "materials",
                    label: "Classroom material",
                    icon: <FolderOpen size={16} />,
                    count: materials.length,
                  },
                  {
                    id: "students",
                    label: "Students",
                    icon: <Users size={16} />,
                    count: studentCount,
                  },
                ]}
              />
            </div>

            <ClassroomTabPanel id={activeTab} className="mt-4">
              {activeTab === "lessons" && (
                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold">Lessons</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {lessonCount} lesson{lessonCount !== 1 ? "s" : ""} in this classroom
                      </p>
                    </div>
                    <Link
                      to={`/create-lesson?classroomId=${classroomId}`}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"
                    >
                      <Plus size={15} /> Create lesson
                    </Link>
                  </div>
                  {lessons.length === 0 ? (
                    <EmptyLessons />
                  ) : (
                    <div className="mt-2">
                      {lessons.map((lesson) => (
                        <ClassroomLessonRow
                          key={lesson.id}
                          lesson={lesson}
                          onDelete={setLessonToDelete}
                          onOpen={(openedLesson) =>
                            navigate(`/teacher-classroom/${classroomId}/lesson/${openedLesson.id}`)
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "materials" && (
                <ClassroomMaterialsTimeline
                  materials={materials}
                  onFileUpload={addFile}
                  onAddLink={addLink}
                  onDeleteMaterial={setMaterialToDelete}
                  isSaving={isSavingMaterial}
                  error={materialError}
                />
              )}

              {activeTab === "students" && classroomId && (
                <ClassroomStudentsTab
                  classroomId={classroomId}
                  students={enrolledStudents}
                  enrolledAt={enrolledAt}
                  lessonIds={lessons.map((lesson) => lesson.id)}
                  rosterError={enrollmentError}
                  onRemove={setStudentToRemove}
                />
              )}
            </ClassroomTabPanel>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(lessonToDelete)}
        isDeleting={isDeletingLesson}
        onCancel={() => setLessonToDelete(null)}
        onConfirm={() => void deleteLesson()}
        title={`Delete ${lessonToDelete?.title ?? "this lesson"}?`}
        description="This will permanently remove this lesson from the classroom. This action cannot be undone."
        confirmLabel="Delete lesson"
        deletingLabel="Deleting lesson..."
      />

      <ConfirmDialog
        open={Boolean(studentToRemove)}
        isDeleting={isRemovingStudent}
        onCancel={() => setStudentToRemove(null)}
        onConfirm={() => void removeStudent()}
        title={`Remove ${[studentToRemove?.name, studentToRemove?.surname].filter(Boolean).join(" ") || "this student"}?`}
        description="This will unenrol the student from this classroom. They can rejoin later with the classroom code."
        confirmLabel="Remove student"
        deletingLabel="Removing..."
      />

      <ConfirmDialog
        open={Boolean(materialToDelete)}
        isDeleting={isDeletingMaterial}
        onCancel={() => setMaterialToDelete(null)}
        onConfirm={() => void deleteMaterial()}
        title={`Delete ${materialToDelete?.title ?? "this material"}?`}
        description="This will permanently remove this material from the classroom and its stored file, if any. This action cannot be undone."
        confirmLabel="Delete material"
        deletingLabel="Deleting..."
      />
    </div>
  );
}
