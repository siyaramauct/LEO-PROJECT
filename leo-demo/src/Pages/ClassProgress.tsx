// -----------------------------------------------------------------------------
// Class Progress
//
// The teacher's Reports page: a list of their classrooms, each opening that
// classroom's full progress report (ClassroomReport).
//
// One layout for every screen, inside TeacherShell: a single column on
// phones, two columns on tablets, three on wide desktops (ClassroomReportPicker).
//
// Route: /class-progress || Access: teachers
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClassroomReportPicker, { type PickerClassroom } from "../Components/ClassroomReportPicker";
import TeacherShell from "../Components/TeacherShell";
import { useAuth } from "../context/AuthContext";
import { getTeacherClassrooms } from "../data/classrooms";

export default function ClassProgress() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<PickerClassroom[]>([]);
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

      try {
        setClassrooms(await getTeacherClassrooms(session.user.id));
      } catch (loadError) {
        console.error("Error loading classrooms:", loadError);
        setError("Unable to load your classrooms.");
        setClassrooms([]);
      } finally {
        setIsLoading(false);
      }
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

  return (
    <TeacherShell active="reports" header={header}>
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:max-w-7xl">
        <ClassroomReportPicker
          classrooms={classrooms}
          isLoading={isLoading}
          error={error}
          emptyMessage="Create a classroom to start viewing reports."
          onSelect={(classroomId) => navigate(`/class-progress/${classroomId}`)}
        />
      </div>
    </TeacherShell>
  );
}
