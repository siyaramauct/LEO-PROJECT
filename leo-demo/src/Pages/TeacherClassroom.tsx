
import {
  Bell,
  Plus,
  Search,
  Sparkles,
  Users,
  Home,
  BarChart3,
  User,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ClassroomDesktopCard from "../Components/ClassroomDesktopCard";
import ClassroomMobileCard, {
  type Classroom,
} from "../Components/ClassroomMobileCard";
import DeleteAccountDialog from "../Components/DeleteAccountDialog";
import { EmptyClassrooms } from "../Components/EmptyClassroomContent";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import UserIdentity from "../Components/UserIdentity";
import { supabase } from "../supabase-client";

type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
  created_date: Date | null;
  join_code?: string | null;
  // Embedded PostgREST counts, e.g. [{ count: 3 }]
  lessons?: { count: number }[] | null;
  classroom_students?: { count: number }[] | null;
};

const formatCreatedDate = (createdAt: Date | null) => {
  if (!createdAt) return "recently";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(createdAt));
};

const toClassroom = (classroom: ClassroomRow): Classroom => {
  const { data } = supabase.storage
    .from("images")
    .getPublicUrl(classroom.cover_image_path ?? "");
  const coverUrl = data.publicUrl;

  return {
    id: classroom.classroom_id,
    name: classroom.classroom_name,
    description: classroom.description ?? "No description has been added yet.",
    studentCount: classroom.classroom_students?.[0]?.count ?? 0,
    lessonCount: classroom.lessons?.[0]?.count ?? 0,
    joinCode: classroom.join_code ?? "Not available",
    createdDate: formatCreatedDate(classroom.created_date),
    image: classroom.cover_image_path ? coverUrl : "",
    imageAlt: `${classroom.classroom_name} classroom cover`,
    imageClassName: "object-cover",
  };
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function TeacherClassrooms() {
  const { session } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [isDeletingClassroom, setIsDeletingClassroom] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("classrooms")
        .select(
          `
          classroom_id,
          classroom_name,
          description,
          cover_image_path,
          created_date,
          join_code,
          lessons(count),
          classroom_students(count)
        `
        )
        .eq("teacher_id", session.user.id)
        .order("classroom_name", { ascending: true });

      if (error) {
        setLoadError("We could not load your classrooms. Please try again.");
        setClassrooms([]);
      } else {
        setClassrooms((data as ClassroomRow[]).map(toClassroom));
      }
      setIsLoading(false);
    };

    void loadClassrooms();
  }, [session?.user]);

  const totalStudents = classrooms.reduce(
    (total, classroom) => total + classroom.studentCount,
    0
  );

  async function deleteClassroom() {
    if (!classroomToDelete || !session?.user || isDeletingClassroom) return;

    setIsDeletingClassroom(true);
    const { error } = await supabase
      .from("classrooms")
      .delete()
      .eq("classroom_id", classroomToDelete.id)
      .eq("teacher_id", session.user.id);

    if (error) {
      console.error("Failed to delete classroom:", error);
      setIsDeletingClassroom(false);
      window.alert("The classroom could not be deleted. Please try again.");
      return;
    }

    setClassrooms((currentClassrooms) =>
      currentClassrooms.filter((classroom) => classroom.id !== classroomToDelete.id)
    );
    setClassroomToDelete(null);
    setIsDeletingClassroom(false);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ===================================================
          MOBILE
      =================================================== */}

      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col overflow-y-auto bg-white pb-16 lg:hidden">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4 sm:px-6">

          <div>
            <p className="text-sm text-slate-500">
              Teacher Portal
            </p>

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              My Classrooms
            </h1>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Manage the classrooms you teach.
            </p>
          </div>

          <button
            aria-label="Notifications"
            className="relative rounded-full p-2 transition hover:bg-slate-100"
          >
            <Bell size={21} strokeWidth={1.8} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>

        </header>

        {/* Search */}
        <section className="mt-4 shrink-0 px-4 sm:px-6">

          <div className="relative">

            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search classrooms..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />

          </div>

        </section>


        {/* Create Classroom */}
        <section className="mt-2 shrink-0 px-4 sm:px-6">

          <Link to="/create-classroom" className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800">

            <Plus size={17} />

            Create Classroom

          </Link>

        </section>


        {/* Classroom List */}
        <section className="mt-4 min-h-0 flex-1 px-4 sm:px-6">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-sm font-bold">
              Your Classrooms
            </h2>

            <span className="text-xs text-slate-400">
              {classrooms.length} classrooms
            </span>

          </div>


          {isLoading ? <p className="py-8 text-center text-xs text-slate-400">Loading classrooms...</p> : loadError ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">{loadError}</p> : classrooms.length === 0 ? <EmptyClassrooms compact /> : <div className="space-y-2">{classrooms.map((classroom) => <ClassroomMobileCard key={classroom.id} classroom={classroom} onDelete={setClassroomToDelete} />)}</div>}

        </section>


        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">

          <NavItem
            icon={<Home size={19} />}
            label="Home"
            to="/teacher-dashboard"
          />

          <NavItem
            icon={<Users size={19} />}
            label="Classes"
            to="/TeacherClassroom"
            active
          />

          <Link
            to="/learning-hub"
            aria-label="Open the learning hub"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200"
          >
            <Plus size={23} />
          </Link>

          <NavItem
            icon={<BarChart3 size={19} />}
            label="Reports"
            to="/class-progress"
          />

          <NavItem
            icon={<User size={19} />}
            label="Profile"
            to="/teacher-profile"
          />

        </nav>

      </div>


      {/* ===================================================
          DESKTOP
      =================================================== */}

      <div className="hidden min-h-dvh lg:flex">

        {/* Sidebar */}
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">

          <div className="mb-10 px-2">

            <h1 className="text-2xl font-bold tracking-tight">
              LEO
            </h1>

            <p className="text-xs text-violet-200">
              Teacher Portal
            </p>

          </div>


          <nav className="space-y-2">

            <SidebarItem
              icon={<Home size={18} />}
              label="Dashboard"
              to="/teacher-dashboard"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<Users size={18} />}
              label="Classes"
              to="/TeacherClassroom"
              active
            />

            <SidebarItem
              icon={<Sparkles size={18} />}
              label="Explore"
              to="/learning-hub"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<BarChart3 size={18} />}
              label="Reports"
              to="/class-progress"
              inactiveClassName="text-white hover:bg-white/10"
            />

          </nav>


          <div className="mt-auto space-y-2">

            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
              to="/teacher-profile"
              inactiveClassName="text-white hover:bg-white/10"
            />

          </div>

        </aside>


        {/* Desktop Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">

          {/* Header */}
          <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div>

              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                My Classrooms
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View and manage the classrooms you teach.
              </p>

            </div>


            <div className="flex items-center gap-4">

              <button
                aria-label="Notifications"
                className="rounded-xl p-2.5 transition hover:bg-slate-100"
              >
                <Bell size={19} />
              </button>


              <UserIdentity />

            </div>

          </header>


          <div className="mx-auto w-full max-w-7xl p-4">

            {/* Page top actions */}
            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold">
                  Your Classrooms
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {classrooms.length} classrooms · {totalStudents} students
                </p>

              </div>


              <Link to="/create-classroom" className="flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800">

                <Plus size={18} />

                Create Classroom

              </Link>

            </div>


            {/* Search + Filters */}
            <div className="mt-3 flex items-center justify-between">

              <div className="relative w-72">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search classrooms..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

              </div>


              <p className="text-xs text-slate-400">
                Showing all classrooms
              </p>

            </div>


            {/* Classroom Grid */}
            <section className="mt-3">
              {isLoading ? <p className="py-12 text-center text-sm text-slate-400">Loading classrooms...</p> : loadError ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">{loadError}</p> : classrooms.length === 0 ? <EmptyClassrooms /> : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{classrooms.map((classroom) => <ClassroomDesktopCard key={classroom.id} classroom={classroom} onDelete={setClassroomToDelete} />)}</div>}
            </section>

          </div>

        </main>

      </div>

      <DeleteAccountDialog
        open={Boolean(classroomToDelete)}
        isDeleting={isDeletingClassroom}
        onCancel={() => setClassroomToDelete(null)}
        onConfirm={() => void deleteClassroom()}
        title={`Delete ${classroomToDelete?.name ?? "this classroom"}?`}
        description="This will permanently remove this classroom, its lessons, and its student links. This action cannot be undone."
        confirmLabel="Delete classroom"
        deletingLabel="Deleting classroom..."
      />

    </div>
  );
}


