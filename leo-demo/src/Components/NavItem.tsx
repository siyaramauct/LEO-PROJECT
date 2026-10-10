// -----------------------------------------------------------------------------
// Nav Item
//
// One button in the bottom navigation bar shown on phones and tablets.
// Renders as a link when given a destination, otherwise as a plain button.
//
// Used by: TeacherShell and the teacher pages that draw their own navigation
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  to?: string;
};

export default function NavItem({ icon, label, active = false, to }: NavItemProps) {
  const className = `flex flex-col items-center gap-1 text-[10px] ${
    active ? "font-semibold text-violet-700" : "text-slate-400"
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
    <button className={className}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
