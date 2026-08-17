import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  to?: string;
};

// Renders as a Link when a destination is provided, otherwise a static button.
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