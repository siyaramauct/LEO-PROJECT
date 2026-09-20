import {
  ArrowLeft,
  BarChart3,
  Bell,
  Home,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ClassroomLessonRow, { type ClassroomLesson } from "../Components/ClassroomLessonRow";
import ClassroomMaterialsPanel, {
  type ClassroomMaterial,
} from "../Components/ClassroomMaterialsPanel";
import DeleteAccountDialog from "../Components/DeleteAccountDialog";
import { EmptyLessons, EmptyMaterials } from "../Components/EmptyClassroomContent";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import ClassroomInvitePanel, {
  type StudentProfile,
} from "../Components/ClassroomInvitePanel";
import UserIdentity from "../Components/UserIdentity";
import { supabase } from "../supabase-client";

type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
  proficiency_level: string | null;
  language: string | null;
  student_count: number | null;
  lesson_count: number | null;
};

type LessonRow = {
  lesson_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
  status: string | null;
  word_count: number | null;
};

type MaterialRow = {
  resource_id: string;
  resource_type: "document" | "link";
  resource_url: string;
  uploaded_date: string;
};

// Documents have no title column, so the display name is derived from the stored path or link.
const materialTitle = (row: MaterialRow) => {
  if (row.resource_type === "link") {
    try { return new URL(row.resource_url).hostname; } catch { return row.resource_url; }
  }
  const segments = row.resource_url.split("/");
  return decodeURIComponent(segments[segments.length - 1] || row.resource_url);
};

const toMaterialDisplay = (row: MaterialRow): ClassroomMaterial => ({
  id: row.resource_id,
  title: materialTitle(row),
  kind: row.resource_type === "link" ? "Link" : "Document",
  detail: row.resource_type === "link" ? "External link" : "Shared document",
});

const toLessonDisplay = (row: LessonRow): ClassroomLesson => ({
  id: row.lesson_id,
  title: row.title,
  image: row.lesson_image_path
    ? supabase.storage.from("images").getPublicUrl(row.lesson_image_path).data.publicUrl
    : "/classRoomIllustration.png",
  imageAlt: row.title,
  status: row.status ?? "Draft",
  words: row.word_count ?? 0,
  completion: 0,
});

export default function ClassroomDetail() {
  const { session } = useAuth();
  const { classroomId } = useParams<{ classroomId: string }>();
  const teacherId = session?.user?.id;
  const [classroom, setClassroom] = useState<ClassroomRow | null>(null);
  const [lessons, setLessons] = useState<ClassroomLesson[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterial[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (!classroomId || !teacherId) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [classroomResult, lessonsResult, enrollmentResult, materialsResult, inviteResult] = await Promise.all([
        supabase.from("classrooms").select("*").eq("classroom_id", classroomId).single(),
        supabase.from("lessons").select("*").eq("classroom_id", classroomId),
        supabase.from("classroom_students").select("student_id").eq("classroom_id", classroomId),
        supabase.from("learning_resources").select("resource_id, resource_type, resource_url, uploaded_date").eq("classroom_id", classroomId).order("uploaded_date", { ascending: false }),
        supabase.rpc("get_classroom_invite_code", { p_classroom_id: classroomId }),
      ]);

      setInviteCode(inviteResult.data ?? null);
      setInviteCodeError(inviteResult.error ? `Could not load invitation code: ${inviteResult.error.message}` : null);

      if (classroomResult.error) {
        console.error("Failed to load classroom:", classroomResult.error);
        setLoadError(`Could not load this classroom: ${classroomResult.error.message}`);
      } else if (!classroomResult.data) {
        setLoadError("This classroom no longer exists or is unavailable.");
      } else {
        setClassroom(classroomResult.data as ClassroomRow);
      }

      if (!lessonsResult.error && lessonsResult.data) {
        setLessons((lessonsResult.data as LessonRow[]).map(toLessonDisplay));
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
        if (studentIds.length) {
          const { data: enrolledProfiles, error: enrolledProfilesError } = await supabase
            .from("profiles")
            .select("id, name, surname, username, user_role")
            .in("id", studentIds);
          if (enrolledProfilesError) {
            console.error("Failed to load enrolled student profiles:", enrolledProfilesError);
            setEnrollmentError(`Students are enrolled, but their profiles could not be loaded: ${enrolledProfilesError.message}`);
          } else {
            console.log("Loaded enrolled student profiles:", enrolledProfiles);
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

  const enrolledStudents = studentProfiles.filter((student) => enrolledStudentIds.includes(student.id));

  async function rotateInviteCode() {
    if (!classroomId || isRotatingCode || !window.confirm("Create a new classroom code? The old code will stop working.")) return;
    setIsRotatingCode(true);
    setInviteCodeError(null);
    const { data, error } = await supabase.rpc("rotate_classroom_invite_code", { p_classroom_id: classroomId });
    setIsRotatingCode(false);
    if (error || !data) {
      setInviteCodeError(error?.message ?? "Could not create a new code.");
      return;
    }
    setInviteCode(data);
  }

  const addFile = async (file: File) => {
    if (!classroomId || !teacherId) return;
    setIsSavingMaterial(true);
    setMaterialError(null);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    // Supabase Storage has no real folders; this prefix auto-creates a per-classroom folder on upload.
    const storagePath = `classroom_documents/${classroomId}/${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      console.error("Document storage upload failed:", uploadError);
      setMaterialError(`The document could not be uploaded: ${uploadError.message}`);
      setIsSavingMaterial(false);
      return;
    }
    const { data, error } = await supabase.from("learning_resources").insert({
      classroom_id: classroomId,
      resource_type: "document",
      resource_url: storagePath,
    }).select("resource_id, resource_type, resource_url, uploaded_date").single();
    setIsSavingMaterial(false);
    if (error || !data) {
      console.error("Learning resource insert failed:", error);
      setMaterialError(`The document was uploaded but could not be shared: ${error?.message ?? "No resource was returned."}`);
      return;
    }
    setMaterials((prev) => [toMaterialDisplay(data as MaterialRow), ...prev]);
  };

  const addLink = async (url: string) => {
    if (!classroomId || !teacherId) return;
    setIsSavingMaterial(true);
    setMaterialError(null);
    const externalUrl = url.includes("://") ? url : `https://${url}`;
    new URL(externalUrl); // validates the link before it is shared with learners
    const { data, error } = await supabase.from("learning_resources").insert({
      classroom_id: classroomId,
      resource_type: "link",
      resource_url: externalUrl,
    }).select("resource_id, resource_type, resource_url, uploaded_date").single();
    setIsSavingMaterial(false);
    if (error || !data) {
      setMaterialError("The link could not be shared with learners. Please try again.");
      return;
    }
    setMaterials((prev) => [toMaterialDisplay(data as MaterialRow), ...prev]);
  };

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

    setLessons((currentLessons) => currentLessons.filter((lesson) => lesson.id !== lessonToDelete.id));
    setLessonToDelete(null);
  };

  const coverUrl = classroom?.cover_image_path
    ? supabase.storage.from("images").getPublicUrl(classroom.cover_image_path).data.publicUrl
    : "/classRoomIllustration.png";

  const classroomName = classroom?.classroom_name ?? "Classroom";
  const description = classroom?.description ?? "";
  const studentCount = enrolledStudentIds.length;
  const lessonCount = lessons.length;

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
      {/* Mobile */}
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={19} />
          </Link>
          <button aria-label="Notifications" className="relative rounded-full p-2 transition hover:bg-slate-100">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>
        </header>

        <main className="px-4 pb-5 sm:px-6">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-8 h-11 w-24 rounded-t-full bg-white/10" />
            <div className="absolute inset-y-0 right-0 w-28 overflow-hidden bg-white">
              <img src={coverUrl} alt={classroomName} className="block h-full w-full object-cover" />
            </div>
            <p className="relative z-10 pr-28 text-xs font-medium text-white">Classroom</p>
            <div className="relative z-10 mt-3 pr-28">
              <h1 className="text-xl font-bold">{classroomName}</h1>
              {description && <p className="mt-1 text-xs text-white/80">{description}</p>}
            </div>
          </section>

          <div className="mt-3">
            <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} isSaving={isSavingMaterial} error={materialError} />
            {materials.length === 0 && <EmptyMaterials />}
          </div>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <ClassroomInvitePanel classroomName={classroomName} code={inviteCode} codeError={inviteCodeError} students={enrolledStudents} rosterError={enrollmentError} isRotating={isRotatingCode} onRotate={() => void rotateInviteCode()} />
          </section>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Lessons</h2>
                <p className="mt-1 text-xs text-slate-500">{lessonCount} lesson{lessonCount !== 1 ? "s" : ""}</p>
              </div>
              <Link to={`/create-lesson?classroomId=${classroomId}`} className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800">
                <Plus size={14} /> Lesson
              </Link>
            </div>
            {lessons.length === 0 ? (
              <EmptyLessons />
            ) : (
              <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.id} lesson={lesson} onDelete={setLessonToDelete} />)}</div>
            )}
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" active />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white"><Plus size={23} /></Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" />
        </nav>
      </div>

      {/* Desktop */}
      <div className="hidden min-h-dvh lg:flex">
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" active />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" to="/learning-hub" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" to="/teacher-profile" /></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link>
              <div><p className="text-xs font-medium text-violet-700">Teacher Portal</p><h1 className="mt-1 text-xl font-bold">Classroom overview</h1></div>
            </div>
            <div className="flex items-center gap-4"><button aria-label="Notifications" className="rounded-xl p-2.5 transition hover:bg-slate-100"><Bell size={19} /></button><UserIdentity /></div>
          </header>

          <div className="mx-auto w-full max-w-7xl p-5">
            <section className="relative flex items-center justify-between gap-6 overflow-hidden rounded-xl bg-violet-700 p-5 text-white">
              <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute bottom-0 right-48 h-20 w-32 rounded-t-full bg-white/10" />
              <div className="relative min-w-0">
                <p className="text-xs font-medium text-white">Active classroom</p>
                <h2 className="mt-2 text-2xl font-bold">{classroomName}</h2>
                {description && <p className="mt-2 max-w-2xl text-sm text-white/80">{description}</p>}
                <p className="mt-4 text-xs font-semibold text-white">
                  {studentCount} students · {lessonCount} lessons
                </p>
              </div>
              <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm">
                <img src={coverUrl} alt={classroomName} className="block h-full w-full object-cover" />
              </div>
            </section>

            <div className="mt-4">
              <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} isSaving={isSavingMaterial} error={materialError} />
              {materials.length === 0 && <EmptyMaterials />}
            </div>

            <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <ClassroomInvitePanel classroomName={classroomName} code={inviteCode} codeError={inviteCodeError} students={enrolledStudents} rosterError={enrollmentError} isRotating={isRotatingCode} onRotate={() => void rotateInviteCode()} />
            </section>

            <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div><h2 className="text-base font-bold">Lessons</h2><p className="mt-1 text-sm text-slate-500">{lessonCount} lesson{lessonCount !== 1 ? "s" : ""} in this classroom</p></div>
                <Link to={`/create-lesson?classroomId=${classroomId}`} className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"><Plus size={15} /> Create lesson</Link>
              </div>
              {lessons.length === 0 ? (
                <EmptyLessons />
              ) : (
                <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.id} lesson={lesson} onDelete={setLessonToDelete} />)}</div>
              )}
            </section>

          </div>
        </main>
      </div>

      <DeleteAccountDialog
        open={Boolean(lessonToDelete)}
        isDeleting={isDeletingLesson}
        onCancel={() => setLessonToDelete(null)}
        onConfirm={() => void deleteLesson()}
        title={`Delete ${lessonToDelete?.title ?? "this lesson"}?`}
        description="This will permanently remove this lesson from the classroom. This action cannot be undone."
        confirmLabel="Delete lesson"
        deletingLabel="Deleting lesson..."
      />
    </div>
  );
}
