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
import BannerDescription from "../Components/BannerDescription";
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
import {
  getClassroom,
  getInviteCode,
  rotateInviteCode,
  type ClassroomSummary,
} from "../data/classrooms";
import { errorMessage } from "../data/errors";
import { deleteLesson } from "../data/lessons";
import { getClassroomMaterials, materialUrl, type Material } from "../data/materials";
import {
  getClassroomLessonSummaries,
  getClassroomStudents,
  removeMaterial,
  removeStudent,
  shareDocument,
  shareLink,
  type ClassroomLessonSummary,
} from "../services/teacherClassroomService";
import { bucketImageUrlOrBroken } from "../utils/images";
import { validateMaterialFile } from "../utils/materialFileTypes";

// -- Types --------------------------------------------------------------------

type DesktopTab = "lessons" | "materials" | "students";
const DESKTOP_TABS: DesktopTab[] = ["lessons", "materials", "students"];

// -- Display helpers ----------------------------------------------------------

// Materials have no title column: links show their website, documents their
// file name without the "<uuid>-" prefix added on upload.
const materialTitle = (row: Material) => {
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

const toMaterialDisplay = (row: Material): ClassroomMaterial => ({
  id: row.resource_id,
  title: materialTitle(row),
  kind: row.resource_type === "link" ? "Link" : "Document",
  detail: row.resource_type === "link" ? "External link" : "Shared document",
  resourceType: row.resource_type,
  resourcePath: row.resource_url,
  url: materialUrl(row),
  uploadedDate: row.uploaded_date,
});

// Turns a lesson from teacherClassroomService into a lesson row.
const toLessonDisplay = (lesson: ClassroomLessonSummary): ClassroomLesson => ({
  id: lesson.lesson_id,
  title: lesson.title,
  image: bucketImageUrlOrBroken(lesson.lesson_image_path),
  imageAlt: lesson.title,
  status: lesson.isScheduled ? "Scheduled" : "Published",
  words: lesson.wordCount,
  completion: 0,
  hasQuiz: lesson.hasQuiz,
});

// -- Page ---------------------------------------------------------------------

export default function ClassroomDetail() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();
  const teacherId = session?.user?.id;
  const [classroom, setClassroom] = useState<ClassroomSummary | null>(null);
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
  // Together: the classroom, its lessons (teacherClassroomService adds the
  // quiz flag and word count), the students, the shared materials and the
  // private invite code. Each part can fail on its own without hiding the
  // rest of the page.
  useEffect(() => {
    if (!classroomId || !teacherId) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [classroomResult, lessonsResult, studentsResult, materialsResult, inviteResult] =
        await Promise.allSettled([
          getClassroom(classroomId),
          getClassroomLessonSummaries(classroomId),
          getClassroomStudents(classroomId),
          getClassroomMaterials(classroomId),
          getInviteCode(classroomId),
        ]);

      // The invite code.
      if (inviteResult.status === "fulfilled") {
        setInviteCode(inviteResult.value);
        setInviteCodeError(null);
      } else {
        setInviteCode(null);
        setInviteCodeError(errorMessage(inviteResult.reason, "Could not load invitation code."));
      }

      // The classroom itself.
      if (classroomResult.status === "rejected") {
        console.error("Failed to load classroom:", classroomResult.reason);
        setLoadError(errorMessage(classroomResult.reason, "Could not load this classroom."));
      } else if (!classroomResult.value) {
        setLoadError("This classroom no longer exists or is unavailable.");
      } else {
        setClassroom(classroomResult.value);
      }

      // Lessons and materials. A failure leaves that list empty.
      if (lessonsResult.status === "fulfilled") {
        setLessons(lessonsResult.value.map(toLessonDisplay));
      }

      if (materialsResult.status === "fulfilled") {
        setMaterials(materialsResult.value.map(toMaterialDisplay));
      }

      // The students and when each one joined.
      if (studentsResult.status === "rejected") {
        console.error("Failed to load enrolled students:", studentsResult.reason);
        setEnrollmentError(
          errorMessage(studentsResult.reason, "Could not load enrolled students."),
        );
      } else {
        const { roster, profiles } = studentsResult.value;

        setEnrolledStudentIds(roster.map((entry) => entry.student_id));
        setEnrolledAt(
          Object.fromEntries(roster.map((entry) => [entry.student_id, entry.enrolled_at])),
        );
        setStudentProfiles(profiles);
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
  async function handleRotateCode() {
    const confirmed = window.confirm(
      "Create a new classroom code? The old code will stop working.",
    );

    if (!classroomId || isRotatingCode || !confirmed) return;

    setIsRotatingCode(true);
    setInviteCodeError(null);

    try {
      setInviteCode(await rotateInviteCode(classroomId));
    } catch (rotateError) {
      setInviteCodeError(errorMessage(rotateError, "Could not create a new code."));
    } finally {
      setIsRotatingCode(false);
    }
  }

  // -- Materials --

  // Checks the file type here, so the teacher sees the reason straight away;
  // teacherClassroomService uploads it, shares it and tells the students.
  const handleAddFile = async (file: File) => {
    if (!classroomId || !teacherId) return;

    const validation = validateMaterialFile(file);

    if ("error" in validation) {
      setMaterialError(validation.error);
      return;
    }

    setIsSavingMaterial(true);
    setMaterialError(null);

    try {
      const material = await shareDocument({
        classroomId,
        classroomName: classroom?.classroom_name ?? "your classroom",
        file,
        contentType: validation.contentType,
      });

      setMaterials((prev) => [toMaterialDisplay(material), ...prev]);
    } catch (shareError) {
      console.error("Failed to share document:", shareError);
      setMaterialError(errorMessage(shareError, "The document could not be shared."));
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleAddLink = async (url: string) => {
    if (!classroomId || !teacherId) return;

    setIsSavingMaterial(true);
    setMaterialError(null);

    try {
      const material = await shareLink({
        classroomId,
        classroomName: classroom?.classroom_name ?? "your classroom",
        url,
      });

      setMaterials((prev) => [toMaterialDisplay(material), ...prev]);
    } catch (shareError) {
      setMaterialError(
        errorMessage(shareError, "The link could not be shared with learners. Please try again."),
      );
    } finally {
      setIsSavingMaterial(false);
    }
  };

  // -- Confirmed deletions (each runs after its ConfirmDialog) --

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;

    setIsDeletingLesson(true);
    setLoadError(null);

    try {
      await deleteLesson(lessonToDelete.id);

      setLessons((currentLessons) =>
        currentLessons.filter((lesson) => lesson.id !== lessonToDelete.id),
      );
      setLessonToDelete(null);
    } catch (deleteError) {
      setLoadError(errorMessage(deleteError, "Could not delete lesson."));
    } finally {
      setIsDeletingLesson(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!classroomId || !studentToRemove) return;

    setIsRemovingStudent(true);
    setEnrollmentError(null);

    try {
      await removeStudent({
        classroomId,
        classroomName: classroom?.classroom_name ?? "a classroom",
        studentId: studentToRemove.id,
      });

      setStudentProfiles((students) =>
        students.filter((student) => student.id !== studentToRemove.id),
      );
      setEnrolledStudentIds((studentIds) => studentIds.filter((id) => id !== studentToRemove.id));
      setStudentToRemove(null);
    } catch (removeError) {
      setEnrollmentError(errorMessage(removeError, "Could not remove this student."));
    } finally {
      setIsRemovingStudent(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;

    setIsDeletingMaterial(true);
    setMaterialError(null);

    try {
      await removeMaterial(materialToDelete);

      setMaterials((prev) => prev.filter((material) => material.id !== materialToDelete.id));
      setMaterialToDelete(null);
    } catch (deleteError) {
      setMaterialError(errorMessage(deleteError, "Could not delete this material."));
    } finally {
      setIsDeletingMaterial(false);
    }
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
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-nav-16 lg:hidden">
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
              {/* The cover picture leaves a narrow column, so long descriptions
                  stop at three lines, with Read more. */}
              {description && (
                <BannerDescription text={description} className="mt-1 text-xs text-white/80" />
              )}
            </div>
          </section>

          <div className="md:grid md:grid-cols-2 md:items-start md:gap-3">
            <div className="mt-3">
              <ClassroomMaterialsPanel
                materials={materials}
                onFileUpload={handleAddFile}
                onAddLink={handleAddLink}
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
                onRotate={() => void handleRotateCode()}
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
                    onRotate={() => void handleRotateCode()}
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
                  onFileUpload={handleAddFile}
                  onAddLink={handleAddLink}
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
        onConfirm={() => void handleDeleteLesson()}
        title={`Delete ${lessonToDelete?.title ?? "this lesson"}?`}
        description="This will permanently remove this lesson from the classroom. This action cannot be undone."
        confirmLabel="Delete lesson"
        deletingLabel="Deleting lesson..."
      />

      <ConfirmDialog
        open={Boolean(studentToRemove)}
        isDeleting={isRemovingStudent}
        onCancel={() => setStudentToRemove(null)}
        onConfirm={() => void handleRemoveStudent()}
        title={`Remove ${[studentToRemove?.name, studentToRemove?.surname].filter(Boolean).join(" ") || "this student"}?`}
        description="This will unenrol the student from this classroom. They can rejoin later with the classroom code."
        confirmLabel="Remove student"
        deletingLabel="Removing..."
      />

      <ConfirmDialog
        open={Boolean(materialToDelete)}
        isDeleting={isDeletingMaterial}
        onCancel={() => setMaterialToDelete(null)}
        onConfirm={() => void handleDeleteMaterial()}
        title={`Delete ${materialToDelete?.title ?? "this material"}?`}
        description="This will permanently remove this material from the classroom and its stored file, if any. This action cannot be undone."
        confirmLabel="Delete material"
        deletingLabel="Deleting..."
      />
    </div>
  );
}
