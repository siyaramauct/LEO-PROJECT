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
  // Each item shares the bar's width equally, so the whole slot is tappable,
  // and is at least 44px tall, the usual minimum for a touch target.
  const className = `flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
    active ? "font-semibold text-violet-700" : "text-slate-500"
  }`;

  if (to) {
    return (
      <Link to={to} className={className} aria-current={active ? "page" : undefined}>
        {icon}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
