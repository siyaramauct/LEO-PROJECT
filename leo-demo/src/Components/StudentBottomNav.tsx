import {
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  SparklesIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const desktopNavItems = [
  { label: "Home", path: "/student/dashboard", icon: HomeIcon },
  { label: "Classrooms", path: "/student/classrooms", icon: UserGroupIcon },
  { label: "Hub", path: "/student/hub", icon: SparklesIcon },
  { label: "Profile", path: "/student/profile", icon: UserIcon },
]

const mobileStartItems = desktopNavItems.slice(0, 2)
const mobileEndItems = [
  { label: "Hub", path: "/student/hub", icon: SparklesIcon },
  { label: "Profile", path: "/student/profile", icon: UserIcon },
]

export default function StudentBottomNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col bg-violet-800 px-4 py-5 text-white shadow-xl md:flex">
        <Link to="/student/dashboard" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-black">
            L
          </span>
          <span>
            <span className="block text-lg font-black leading-none">LEO</span>
            <span className="text-[11px] font-semibold text-violet-100">Student</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-2">
          {desktopNavItems.map((item) => (
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
            <PlusIcon className="h-5 w-5" />
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

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-18 max-w-md items-center justify-around border-t border-slate-200 bg-white px-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:hidden">
        {mobileStartItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex min-w-12 flex-col items-center gap-1 text-[10px] font-semibold ${
                isActive ? "text-violet-700" : "text-slate-500"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}

        <NavLink
          to="/student/flashcards"
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200 transition active:scale-95"
          aria-label="Start practice"
        >
          <PlusIcon className="h-6 w-6" />
        </NavLink>

        {mobileEndItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex min-w-12 flex-col items-center gap-1 text-[10px] font-semibold ${
                isActive ? "text-violet-700" : "text-slate-500"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
