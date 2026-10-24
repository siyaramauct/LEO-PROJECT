// -----------------------------------------------------------------------------
// Student Navigation
//
// The student portal's navigation. It renders one of three layouts, chosen by
// screen width with Tailwind breakpoints (no JavaScript involved):
//
//   Phone   (under 768px)    bottom bar: Home, Classrooms, Practice, Report, Profile
//   Tablet  (768 to 1023px)  full-width bottom bar that adds Lessons and Hub
//   Desktop (1024px and up)  fixed violet sidebar with every link and Log out
//
// Student pages leave room for it with "pb-nav-20 lg:pb-0 lg:ml-56" on their
// main element: bottom padding for the bar below 1024px (pb-nav-20, see
// index.css), a left margin for the sidebar from 1024px. The bar hides while
// the on-screen keyboard is up, so it doesn't cover the field.
//
// Used by: every student page
// -----------------------------------------------------------------------------

import {
  ArrowLeftOnRectangleIcon,
  BookOpenIcon,
  ChartBarIcon,
  HomeIcon,
  PlayCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useTypingOnTouchScreen from "../hooks/useTypingOnTouchScreen";
import { projectImageUrl } from "../utils/images";

// -- Links --------------------------------------------------------------------

const navItems = {
  home: { label: "Home", path: "/student/dashboard", icon: HomeIcon },
  classrooms: { label: "Classrooms", path: "/student/classrooms", icon: UserGroupIcon },
  lessons: { label: "Lessons", path: "/lessons", icon: BookOpenIcon },
  practice: { label: "Practice", path: "/student/practice", icon: PlayCircleIcon },
  report: { label: "Report", path: "/student/report", icon: ChartBarIcon },
  hub: { label: "Hub", path: "/student/hub", icon: SparklesIcon },
  profile: { label: "Profile", path: "/student/profile", icon: UserIcon },
};

type NavEntry = (typeof navItems)[keyof typeof navItems];

const desktopItems = [
  navItems.home,
  navItems.classrooms,
  navItems.lessons,
  navItems.report,
  navItems.hub,
  navItems.profile,
];

// The bottom bar's tabs, all the same size, with Practice in the middle. Items
// marked tabletOnly are hidden on phones, where there is room for five.
const barItems = [
  { ...navItems.home, tabletOnly: false },
  { ...navItems.classrooms, tabletOnly: false },
  { ...navItems.lessons, tabletOnly: true },
  { ...navItems.practice, tabletOnly: false },
  { ...navItems.report, tabletOnly: false },
  { ...navItems.hub, tabletOnly: true },
  { ...navItems.profile, tabletOnly: false },
];

// -- Bottom bar link ----------------------------------------------------------

function BarLink({ item, tabletOnly }: { item: NavEntry; tabletOnly: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `min-h-11 w-full min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
          tabletOnly ? "hidden md:flex" : "flex"
        } ${isActive ? "text-violet-700" : "text-slate-500"}`
      }
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  );
}

// -- Component ----------------------------------------------------------------

export default function StudentBottomNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isTyping = useTypingOnTouchScreen();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // -- Desktop sidebar, 1024px and up --

  const desktopSidebar = (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col bg-violet-800 px-4 py-5 text-white shadow-xl lg:flex">
      <Link to="/student/dashboard" className="mb-8 px-2">
        <img
          src={projectImageUrl("logo-wordmark-light.svg")}
          alt="LEO - Learn English Online"
          className="h-auto w-40"
        />
        <span className="mt-2 block text-xs font-semibold text-violet-100">Student Portal</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {desktopItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                isActive ? "bg-white text-violet-800" : "text-violet-50 hover:bg-white/10"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}

        <NavLink
          to="/student/practice"
          className={({ isActive }) =>
            `mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
              isActive ? "bg-white text-violet-800" : "bg-white/10 text-violet-50 hover:bg-white/15"
            }`
          }
        >
          <PlayCircleIcon className="h-5 w-5" />
          Practice
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-violet-50 transition hover:bg-white/10"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          Log out
        </button>
      </nav>
    </aside>
  );

  // -- Bottom bar, phones and tablets --
  // Hidden while the on-screen keyboard is up, so it doesn't cover the field.

  const bottomBar = isTyping ? null : (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(15,23,42,0.08)] lg:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2 md:max-w-2xl md:grid-cols-7">
        {barItems.map((item) => (
          <BarLink key={item.label} item={item} tabletOnly={item.tabletOnly} />
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {desktopSidebar}
      {bottomBar}
    </>
  );
}
