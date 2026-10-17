// -----------------------------------------------------------------------------
// Student Report Picker
//
// The student's Reports page: the same classroom picker teachers use
// (ClassroomReportPicker), listing the classrooms the student has joined.
// Each card opens the student's learning report with that classroom selected
// (StudentLearningReport).
//
// One layout for every screen: a single column on phones, two columns on
// tablets, three on wide desktops.
//
// Route: /student/report || Access: students
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClassroomReportPicker, { type PickerClassroom } from "../Components/ClassroomReportPicker";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { getEnrolledClassrooms } from "../services/classroomService";

export default function StudentReportPicker() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<PickerClassroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the classrooms the student has joined, alphabetically.
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        setClassrooms(await getEnrolledClassrooms(session.user.id));
      } catch (loadError) {
        console.error("Error loading classrooms:", loadError);
        setError("Unable to load your classrooms.");
        setClassrooms([]);
      }
      setIsLoading(false);
    };

    void loadClassrooms();
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-medium text-violet-700">Student portal</p>
            <h1 className="mt-1 text-xl font-bold">Class Reports</h1>
            <p className="mt-1 text-xs text-slate-500">View your progress in each classroom.</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:max-w-7xl lg:p-8">
          <ClassroomReportPicker
            classrooms={classrooms}
            isLoading={isLoading}
            error={error}
            emptyMessage="Join a classroom to start viewing reports."
            onSelect={(classroomId) => navigate(`/student/report/${classroomId}`)}
          />
        </div>
      </main>
    </div>
  );
}
