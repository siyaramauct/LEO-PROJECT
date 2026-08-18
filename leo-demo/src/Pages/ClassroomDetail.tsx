import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  Home,
  Layers,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ClassroomLessonRow, { type ClassroomLesson } from "../Components/ClassroomLessonRow";
import ClassroomMaterialsPanel, {
  type ClassroomMaterial,
} from "../Components/ClassroomMaterialsPanel";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import UserIdentity from "../Components/UserIdentity";
import { supabase } from "../supabase-client";

type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
  join_code: string | null;
  proficiency_level: string | null;
  language: string | null;
  student_count: number | null;
  lesson_count: number | null;
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
  status: string | null;
  word_count: number | null;
};

type StudentProfile = {
  id: string;
  name: string | null;
  surname: string | null;
  username: string | null;
  user_role: string | null;
};

const toLessonDisplay = (row: LessonRow): ClassroomLesson => ({
  title: row.title,
  image: row.lesson_image_path
    ? supabase.storage.from("images").getPublicUrl(row.lesson_image_path).data.publicUrl
    : "/classRoomIllustration.png",
  imageAlt: row.title,
  status: row.status ?? "Draft",
  words: row.word_count ?? 0,
  completion: 0,
});

function EmptyLessons() {
  return (
    <div className="flex flex-col items-center px-4 py-7 text-center sm:py-8">
      <BookOpen size={26} className="text-slate-300" />
      <p className="mt-2 text-sm font-semibold text-violet-700">No lessons yet</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">Use the create lesson button above to add the first lesson for this classroom.</p>
    </div>
  );
}

function EmptyMaterials() {
  return (
    <p className="pb-4 pt-2 text-center text-xs text-slate-400">
      No materials yet. Upload a document or paste a link above.
    </p>
  );
}

type StudentEnrollmentPanelProps = {
  students: StudentProfile[];
  searchTerm: string;
  searchResults: StudentProfile[];
  selectedStudent: StudentProfile | null;
  isSearching: boolean;
  isEnrolling: boolean;
  error: string | null;
  onSearchTermChange: (searchTerm: string) => void;
  onSearch: () => void;
  onStudentSelect: (student: StudentProfile) => void;
  onStudentCancel: () => void;
  onEnroll: () => void;
};

function StudentEnrollmentPanel({ students, searchTerm, searchResults, selectedStudent, isSearching, isEnrolling, error, onSearchTermChange, onSearch, onStudentSelect, onStudentCancel, onEnroll }: StudentEnrollmentPanelProps) {
  return (
    <>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><h2 className="text-base font-bold">Students</h2><p className="mt-1 text-sm text-slate-500">{students.length} enrolled</p></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input value={searchTerm} disabled={isSearching} onChange={(event) => onSearchTermChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="Search username" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 sm:w-52" aria-label="Search students by username" />
          <button type="button" disabled={!searchTerm.trim() || isSearching} onClick={onSearch} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{isSearching ? "Searching..." : "Search"}</button>
        </div>
      </div>
      {!selectedStudent && searchResults.length > 0 && <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">{searchResults.map((student) => <button key={student.id} type="button" onClick={() => onStudentSelect(student)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{[student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student"}</span><span className="mt-1 block text-xs text-slate-500">@{student.username}</span></span><span className="text-xs font-semibold text-violet-700">Select</span></button>)}</div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {students.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><Users size={24} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No students enrolled yet</p><p className="mt-1 text-xs text-slate-400">Search for a student by username to add them to this classroom.</p></div> : <div className="mt-4 divide-y divide-slate-100">{students.map((student) => <div key={student.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{`${student.name?.[0] ?? ""}${student.surname?.[0] ?? ""}` || "S"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{[student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student"}</span>{student.username && <span className="mt-1 block text-xs text-slate-500">@{student.username}</span>}</span></div>)}</div>}
      {selectedStudent && <div role="dialog" aria-modal="true" aria-label="Add student to classroom" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"><p className="text-xs font-medium text-violet-700">Student found</p><h3 className="mt-2 text-lg font-bold text-slate-900">Add this student?</h3><div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{[selectedStudent.name, selectedStudent.surname].filter(Boolean).join(" ") || "Unnamed student"}</p><p className="mt-1 text-sm text-slate-500">@{selectedStudent.username}</p></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isEnrolling} onClick={onStudentCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button><button type="button" disabled={isEnrolling} onClick={onEnroll} className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"><UserPlus size={16} /> {isEnrolling ? "Adding..." : "Add student"}</button></div></div></div>}
    </>
  );
}

export default function ClassroomDetail() {
  const { session } = useAuth();
  const { classroomId } = useParams<{ classroomId: string }>();
  const [classroom, setClassroom] = useState<ClassroomRow | null>(null);
  const [lessons, setLessons] = useState<ClassroomLesson[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterial[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [usernameSearch, setUsernameSearch] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [classroomResult, lessonsResult, enrollmentResult] = await Promise.all([
        supabase.from("classrooms").select("*").eq("classroom_id", classroomId).single(),
        supabase.from("lessons").select("*").eq("classroom_id", classroomId),
        supabase.from("classroom_students").select("student_id").eq("classroom_id", classroomId),
      ]);

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
            setStudentProfiles((enrolledProfiles ?? []) as StudentProfile[]);
          }
        } else {
          setStudentProfiles([]);
        }
      }

      setIsLoading(false);
    };

    void load();
  }, [classroomId]);

  const enrolledStudents = studentProfiles.filter((student) => enrolledStudentIds.includes(student.id));

  async function searchStudents() {
    const searchTerm = usernameSearch.trim();
    if (!searchTerm || isSearchingStudents) return;
    setIsSearchingStudents(true);
    setEnrollmentError(null);
    setSelectedStudent(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, surname, username, user_role")
      .ilike("username", `${searchTerm}%`)
      .order("username")
      .limit(10);
    setIsSearchingStudents(false);
    if (error) {
      setEnrollmentError(error.message);
      return;
    }
    const matchingProfiles = (data ?? []) as StudentProfile[];
    const matchingStudents = matchingProfiles.filter((student) => student.user_role === "student" && !enrolledStudentIds.includes(student.id));
    setStudentSearchResults(matchingStudents);
    const exactMatch = matchingStudents.find((student) => student.username?.toLowerCase() === searchTerm.toLowerCase());
    if (exactMatch) setSelectedStudent(exactMatch);
    if (!matchingStudents.length) {
      const matchingProfile = matchingProfiles.find((profile) => profile.username?.toLowerCase() === searchTerm.toLowerCase());
      const isAlreadyEnrolled = Boolean(matchingProfile && enrolledStudentIds.includes(matchingProfile.id));
      setEnrollmentError(isAlreadyEnrolled ? "This student is already enrolled in the classroom." : matchingProfile ? "This username belongs to a profile that is not marked as a student." : "No profile was found with that username.");
    }
  }

  async function enrollStudent() {
    if (!classroomId || !selectedStudent || !session?.user) return;
    setIsEnrolling(true);
    setEnrollmentError(null);
    const { error } = await supabase.from("classroom_students").insert({
      student_id: selectedStudent.id,
      classroom_id: classroomId,
      enrolled_at: new Date().toISOString(),
    });
    setIsEnrolling(false);
    if (error) {
      setEnrollmentError(error.code === "23505" ? "This student is already enrolled in the classroom." : error.message);
      return;
    }
    setStudentProfiles((students) => students.some((student) => student.id === selectedStudent.id) ? students : [...students, selectedStudent]);
    setEnrolledStudentIds((studentIds) => [...studentIds, selectedStudent.id]);
    setUsernameSearch("");
    setStudentSearchResults([]);
    setSelectedStudent(null);
  }

  const addFile = (file: File) => {
    setMaterials((prev) => [
      { id: `${file.name}-${Date.now()}`, title: file.name, kind: "Document", detail: "Document · Added just now" },
      ...prev,
    ]);
  };

  const addLink = (url: string) => {
    const linkTitle = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    setMaterials((prev) => [
      { id: `${url}-${Date.now()}`, title: linkTitle, kind: "Link", detail: "External link · Added just now" },
      ...prev,
    ]);
  };

  const coverUrl = classroom?.cover_image_path
    ? supabase.storage.from("images").getPublicUrl(classroom.cover_image_path).data.publicUrl
    : "/classRoomIllustration.png";

  const classroomName = classroom?.classroom_name ?? "Classroom";
  const description = classroom?.description ?? "";
  const joinCode = classroom?.join_code ?? "—";
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
            <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} />
            {materials.length === 0 && <EmptyMaterials />}
          </div>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <StudentEnrollmentPanel students={enrolledStudents} searchTerm={usernameSearch} searchResults={studentSearchResults} selectedStudent={selectedStudent} isSearching={isSearchingStudents} isEnrolling={isEnrolling} error={enrollmentError} onSearchTermChange={setUsernameSearch} onSearch={searchStudents} onStudentSelect={setSelectedStudent} onStudentCancel={() => setSelectedStudent(null)} onEnroll={enrollStudent} />
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
              <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.title} lesson={lesson} />)}</div>
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
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" active />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" to="/learning-hub" />
            <SidebarItem icon={<BookOpen size={18} />} label="Lessons" to="/lessons" />
            <SidebarItem icon={<Layers size={18} />} label="Flashcards" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Quizzes" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" to="/teacher-profile" /><SidebarItem icon={<LogOut size={18} />} label="Logout" /></div>
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
                  {studentCount} students · {lessonCount} lessons · Join code {joinCode}
                </p>
              </div>
              <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm">
                <img src={coverUrl} alt={classroomName} className="block h-full w-full object-cover" />
              </div>
            </section>

            <div className="mt-4">
              <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} />
              {materials.length === 0 && <EmptyMaterials />}
            </div>

            <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <StudentEnrollmentPanel students={enrolledStudents} searchTerm={usernameSearch} searchResults={studentSearchResults} selectedStudent={selectedStudent} isSearching={isSearchingStudents} isEnrolling={isEnrolling} error={enrollmentError} onSearchTermChange={setUsernameSearch} onSearch={searchStudents} onStudentSelect={setSelectedStudent} onStudentCancel={() => setSelectedStudent(null)} onEnroll={enrollStudent} />
            </section>

            <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div><h2 className="text-base font-bold">Lessons</h2><p className="mt-1 text-sm text-slate-500">{lessonCount} lesson{lessonCount !== 1 ? "s" : ""} in this classroom</p></div>
                <Link to={`/create-lesson?classroomId=${classroomId}`} className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"><Plus size={15} /> Create lesson</Link>
              </div>
              {lessons.length === 0 ? (
                <EmptyLessons />
              ) : (
                <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.title} lesson={lesson} />)}</div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}