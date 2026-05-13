import { Bars3Icon } from "@heroicons/react/24/outline";
import { UserIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  return (
    <nav className="w-full grid grid-cols-3 items-center p-4 bg-violet-700 text-white">
        <Bars3Icon className="w-6 h-6" />
        <h1 className="text-xl text-center" onClick={() => window.location.href = "/"}>LEO</h1>
        <UserIcon className="w-6 h-6 ml-auto" />
    </nav>
  )
}
