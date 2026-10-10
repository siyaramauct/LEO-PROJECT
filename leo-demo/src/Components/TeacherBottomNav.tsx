// -----------------------------------------------------------------------------
// Teacher Bottom Navigation
//
// The bar fixed to the bottom of every teacher page on phones and tablets
// (under 1024px): Home, Classes, a raised button for the Learning Hub,
// Reports and Profile. Pages leave room for it with bottom padding (pb-16).
// Desktop uses TeacherSidebar instead.
//
// Used by: TeacherShell and every teacher page with its own mobile layout
// -----------------------------------------------------------------------------

import { BarChart3, Home, Plus, User, Users } from "lucide-react";
import { Link } from "react-router-dom";
import NavItem from "./NavItem";
import type { TeacherNavKey } from "./TeacherSidebar";

export default function TeacherBottomNav({ active }: { active?: TeacherNavKey }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1 lg:hidden">
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
        active={active === "reports"}
      />
      <NavItem
        icon={<User size={19} />}
        label="Profile"
        to="/teacher-profile"
        active={active === "profile"}
      />
    </nav>
  );
}
