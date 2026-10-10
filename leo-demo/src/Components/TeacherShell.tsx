// -----------------------------------------------------------------------------
// Teacher Shell
//
// A ready-made page layout for teacher screens that look the same on every
// device apart from navigation: TeacherSidebar on desktop (lg and up),
// TeacherBottomNav on phones and tablets. Pages pass their header and
// content, and which navigation entry to highlight.
//
// Pages whose phone and desktop designs differ a lot (such as the dashboard)
// build two layouts instead and use TeacherSidebar and TeacherBottomNav directly.
//
// Used by: ClassroomReport
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import TeacherBottomNav from "./TeacherBottomNav";
import TeacherSidebar, { type TeacherNavKey } from "./TeacherSidebar";

type TeacherShellProps = {
  active: TeacherNavKey;
  header: ReactNode;
  children: ReactNode;
};

export default function TeacherShell({ active, header, children }: TeacherShellProps) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:flex">
      <div className="hidden lg:block">
        <TeacherSidebar active={active} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          {header}
        </header>
        {children}
      </main>

      <TeacherBottomNav active={active} />
    </div>
  );
}
