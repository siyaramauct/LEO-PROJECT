// -----------------------------------------------------------------------------
// Class Progress
//
// The teacher's Reports page: a list of their classrooms, each opening that
// classroom's full progress report (ClassroomReport).
//
// One layout for every screen, inside TeacherShell: a single column on
// phones, two columns on tablets, three on wide desktops.
//
// Route: /class-progress || Access: teachers
// -----------------------------------------------------------------------------

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TeacherShell from "../Components/TeacherShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";
import { bucketImageUrlOrBroken } from "../utils/images";

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

  // Load the teacher's classrooms, alphabetically.
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
  }, [session?.user]);

  // -- Header --

  const header = (
    <div>
      <p className="text-xs font-medium text-violet-700">Teacher Portal</p>
      <h1 className="mt-1 text-xl font-bold">Class Reports</h1>
      <p className="mt-1 text-xs text-slate-500">View progress for your classrooms.</p>
    </div>
  );

  // -- Content --

  const STATUS_BOX = "rounded-xl border bg-white p-8 text-center lg:p-10";

  let content;
  if (isLoading) {
    content = (
      <div className={`${STATUS_BOX} border-slate-100`}>
        <p className="text-sm text-slate-500">Loading classrooms...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className={`${STATUS_BOX} border-red-100`}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  } else if (classrooms.length === 0) {
    content = (
      <div className={`${STATUS_BOX} border-slate-100`}>
        <p className="text-sm font-semibold text-slate-700">No classrooms yet</p>
        <p className="mt-1 text-xs text-slate-400">Create a classroom to start viewing reports.</p>
      </div>
    );
  } else {
    content = (
      <section>
        <div className="mb-3 hidden lg:block">
          <h2 className="font-bold">Your Classrooms</h2>
          <p className="mt-1 text-xs text-slate-500">Select a classroom to view its report.</p>
        </div>

        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom) => (
            <button
              key={classroom.classroom_id}
              type="button"
              onClick={() => navigate(`/class-progress/${classroom.classroom_id}`)}
              className="flex w-full items-center rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-violet-200"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                <img
                  src={bucketImageUrlOrBroken(classroom.cover_image_path)}
                  alt={`${classroom.classroom_name} classroom`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold">{classroom.classroom_name}</h3>
                <p className="mt-1 text-xs text-slate-500">View classroom report</p>
                <p className="mt-2 text-xs font-semibold text-violet-700">View Report</p>
              </div>
              <ChevronRight size={18} className="ml-2 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <TeacherShell active="reports" header={header}>
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:max-w-7xl">{content}</div>
    </TeacherShell>
  );
}
