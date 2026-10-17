// -----------------------------------------------------------------------------
// Sidebar Item
//
// One entry in the deep violet desktop sidebar. Renders as a link when given a
// destination, otherwise as a button with an onClick handler.
//
// Used by: TeacherShell and the teacher pages that draw their own navigation
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  inactiveClassName?: string;
  to?: string;
  onClick?: () => void;
};

export default function SidebarItem({
  icon,
  label,
  active = false,
  inactiveClassName = "font-medium text-violet-100 hover:bg-white/10 hover:text-white",
  to,
  onClick,
}: SidebarItemProps) {
  const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    active ? "bg-violet-800 font-semibold text-white" : inactiveClassName
  }`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {icon}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
