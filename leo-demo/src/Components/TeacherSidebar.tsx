// -----------------------------------------------------------------------------
// Teacher Sidebar
//
// The violet navigation column on the left of every teacher page on desktop
// (1024px and up). Pages render it inside their desktop layout and say which
// entry to highlight. Phones and tablets use TeacherBottomNav instead.
//
// Used by: TeacherShell and every teacher page with its own desktop layout
// -----------------------------------------------------------------------------

import { BarChart3, Home, Settings, Sparkles, Users } from "lucide-react";
import SidebarItem from "./SidebarItem";

// Which navigation entry is highlighted. Shared with TeacherBottomNav.
export type TeacherNavKey = "dashboard" | "classes" | "explore" | "reports" | "profile";

export default function TeacherSidebar({ active }: { active?: TeacherNavKey }) {
  return (
    <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
      <div className="mb-10 px-2">
        <p className="text-2xl font-bold tracking-tight">LEO</p>
        <p className="text-xs text-violet-200">Teacher Portal</p>
      </div>

      <nav className="space-y-2">
        <SidebarItem
          icon={<Home size={18} />}
          label="Dashboard"
          to="/teacher-dashboard"
          active={active === "dashboard"}
        />
        <SidebarItem
          icon={<Users size={18} />}
          label="Classes"
          to="/TeacherClassroom"
          active={active === "classes"}
        />
        <SidebarItem
          icon={<Sparkles size={18} />}
          label="Explore"
          to="/learning-hub"
          active={active === "explore"}
        />
        <SidebarItem
          icon={<BarChart3 size={18} />}
          label="Reports"
          to="/class-progress"
          active={active === "reports"}
        />
      </nav>

      <div className="mt-auto space-y-2">
        <SidebarItem
          icon={<Settings size={18} />}
          label="Settings"
          to="/teacher-profile"
          active={active === "profile"}
        />
      </div>
    </aside>
  );
}
