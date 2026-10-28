// -----------------------------------------------------------------------------
// Page Loader
//
// The light "please wait" shown while a dashboard loads. The navigation stays
// in place and only this small loader fills the content area, so opening the
// dashboard feels like moving within the app, not restarting it.
//
// The animation lives in index.css (.leo-loader).
//
// Used by: StudentDashboard || TeacherDashboard
// -----------------------------------------------------------------------------

import StudentBottomNav from "./StudentBottomNav";
import TeacherBottomNav from "./TeacherBottomNav";
import TeacherSidebar from "./TeacherSidebar";

type PageLoaderProps = {
  portal: "student" | "teacher";
  label?: string;
};

export default function PageLoader({ portal, label = "Loading your dashboard" }: PageLoaderProps) {
  const loader = (
    <div
      className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="leo-loader" aria-hidden="true">
        <p className="leo-loader-text">loading</p>
        <span className="leo-loader-bar" />
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );

  // Students: StudentBottomNav draws both the bottom bar and the desktop sidebar.
  if (portal === "student") {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <StudentBottomNav />
        <main className="flex min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">{loader}</main>
      </div>
    );
  }

  // Teachers: the sidebar on desktop, the bottom bar on phones and tablets.
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:flex">
      <div className="hidden lg:block">
        <TeacherSidebar active="dashboard" />
      </div>
      <main className="flex min-w-0 flex-1 pb-nav-16 lg:pb-0">{loader}</main>
      <TeacherBottomNav active="dashboard" />
    </div>
  );
}
