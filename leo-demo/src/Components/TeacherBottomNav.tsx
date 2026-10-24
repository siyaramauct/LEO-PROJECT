// -----------------------------------------------------------------------------
// Teacher Bottom Navigation
//
// The bar fixed to the bottom of every teacher page on phones and tablets
// (under 1024px): Home, Classes, Explore (the Learning Hub, with the same icon
// as in TeacherSidebar), Reports and Profile, as five equal tabs.
// Pages leave room for it with bottom padding (pb-nav-16, see index.css). It
// hides while the on-screen keyboard is up, so it doesn't cover the field.
// Desktop uses TeacherSidebar instead.
//
// Used by: TeacherShell and every teacher page with its own mobile layout
// -----------------------------------------------------------------------------

import { BarChart3, Home, Sparkles, User, Users } from "lucide-react";
import useTypingOnTouchScreen from "../hooks/useTypingOnTouchScreen";
import NavItem from "./NavItem";
import type { TeacherNavKey } from "./TeacherSidebar";

export default function TeacherBottomNav({ active }: { active?: TeacherNavKey }) {
  const isTyping = useTypingOnTouchScreen();

  if (isTyping) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center border-t border-slate-100 bg-white px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden">
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
        icon={<User size={19} />}
        label="Profile"
        to="/teacher-profile"
        active={active === "profile"}
      />
    </nav>
  );
}
