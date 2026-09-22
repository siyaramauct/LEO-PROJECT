import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Home,
  Settings,
  Sparkles,
  Users,
  ChevronRight,
} from "lucide-react";

import { supabase } from "../supabase-client";
import { useAuth } from "../../context/AuthContext";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";

type Classroom = {
  classroom_id: string;
  classroom_name: string;
  cover_image_path: string | null;
};

export default function ClassProgress() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClassrooms = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("classrooms")
        .select("classroom_id, classroom_name, cover_image_path")
        .eq("teacher_id", session.user.id)
        .order("classroom_name");

      if (error) {
        console.error("Error loading classrooms:", error);
        setError("Unable to load your classrooms.");
        setClassrooms([]);
      } else {
        setClassrooms(data ?? []);
      }

      setIsLoading(false);
    };

    void loadClassrooms();
  }, [session]);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* =========================
          MOBILE VERSION
      ========================== */}
      <div className="min-h-dvh bg-slate-50 pb-16 lg:hidden">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-xl font-bold">
                Class Reports
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                View progress for your classrooms.
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl p-4 sm:p-6">
          {isLoading ? (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                Loading classrooms...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No classrooms yet
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Create a classroom to start viewing reports.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {classrooms.map((classroom) => {
                const imageUrl = classroom.cover_image_path
                  ? supabase.storage
                      .from("images")
                      .getPublicUrl(classroom.cover_image_path).data.publicUrl
                  : "/classRoomIllustration.png";

                return (
                  <button
                    key={classroom.classroom_id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/class-progress/${classroom.classroom_id}`
                      )
                    }
                    className="flex w-full items-center rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-violet-200"
                  >
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      <img
                        src={imageUrl}
                        alt={`${classroom.classroom_name} classroom`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="ml-3 min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold">
                        {classroom.classroom_name}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        View classroom report
                      </p>

                      <p className="mt-2 text-xs font-semibold text-violet-700">
                        View Report
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="ml-2 shrink-0 text-slate-400"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem
            icon={<Home size={19} />}
            label="Home"
            to="/teacher-dashboard"
          />

          <NavItem
            icon={<Users size={19} />}
            label="Classes"
            to="/TeacherClassroom"
          />

          <NavItem
            icon={<Sparkles size={19} />}
            label="Explore"
            to="/learning-hub"
          />

          <NavItem
            icon={<BarChart3 size={19} />}
            label="Reports"
            to="/class-progress"
            active
          />

          <NavItem
            icon={<Settings size={19} />}
            label="Profile"
            to="/teacher-profile"
          />
        </nav>
      </div>

      {/* =========================
          DESKTOP VERSION
      ========================== */}
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
            />

            <SidebarItem
              icon={<Users size={18} />}
              label="Classes"
              to="/TeacherClassroom"
            />

            <SidebarItem
              icon={<Sparkles size={18} />}
              label="Explore"
              to="/learning-hub"
            />

            <SidebarItem
              icon={<BarChart3 size={18} />}
              label="Reports"
              to="/class-progress"
              active
            />
          </nav>

          <div className="mt-auto space-y-2">
            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
              to="/teacher-profile"
            />
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-xl font-bold">
                Class Reports
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                View progress for your classrooms.
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            {isLoading ? (
              <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading classrooms...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-white p-10 text-center">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            ) : classrooms.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No classrooms yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Create a classroom to start viewing reports.
                </p>
              </div>
            ) : (
              <section>
                <div className="mb-3">
                  <h2 className="font-bold">
                    Your Classrooms
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select a classroom to view its report.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {classrooms.map((classroom) => {
                    const imageUrl = classroom.cover_image_path
                      ? supabase.storage
                          .from("images")
                          .getPublicUrl(
                            classroom.cover_image_path
                          ).data.publicUrl
                      : "/classRoomIllustration.png";

                    return (
                      <button
                        key={classroom.classroom_id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/class-progress/${classroom.classroom_id}`
                          )
                        }
                        className="flex items-center rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-violet-200"
                      >
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                          <img
                            src={imageUrl}
                            alt={`${classroom.classroom_name} classroom`}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold">
                            {classroom.classroom_name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            View classroom report
                          </p>

                          <p className="mt-2 text-xs font-semibold text-violet-700">
                            View Report
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="ml-2 shrink-0 text-slate-400"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
