import { Bars3Icon } from "@heroicons/react/24/outline";
import { UserIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className="w-full grid grid-cols-3 items-center p-4 bg-violet-700 text-white">
      <Bars3Icon className="w-6 h-6" />
      <h1 className="text-xl text-center" onClick={() => navigate("/")}>
        LEO
      </h1>
      <UserIcon className="w-6 h-6 ml-auto" />
    </nav>
  );
}
