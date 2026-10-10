import { BarChart3, Home, Settings, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import NavItem from "./NavItem";
import SidebarItem from "./SidebarItem";

type TeacherNavKey = "dashboard" | "classes" | "explore" | "reports" | "profile";

type TeacherShellProps = {
  active: TeacherNavKey;
  header: ReactNode;
  children: ReactNode;
};

// One responsive layout for teacher pages: sidebar from lg up, bottom navigation below it.
export default function TeacherShell({ active, header, children }: TeacherShellProps) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white lg:flex xl:w-64 xl:px-5">
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

      <main className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          {header}
        </header>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-slate-100 bg-white px-4 py-1 lg:hidden">
        <NavItem
          icon={<Home size={19} />}
          label="Home"
          to="/teacher-dashboard"
          active={active === "dashboard"}
        />
        <NavItem
          icon={<Users size={19} />}
          label="Classes"
          to="/TeacherClassroom"
          active={active === "classes"}
        />
        <NavItem
          icon={<Sparkles size={19} />}
          label="Explore"
          to="/learning-hub"
          active={active === "explore"}
        />
        <NavItem
          icon={<BarChart3 size={19} />}
          label="Reports"
          to="/class-progress"
          active={active === "reports"}
        />
        <NavItem
          icon={<Settings size={19} />}
          label="Profile"
          to="/teacher-profile"
          active={active === "profile"}
        />
      </nav>
    </div>
  );
}
