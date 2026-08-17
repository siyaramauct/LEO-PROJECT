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

// Renders as a Link when a destination is provided, otherwise a static button.
export default function SidebarItem({
  icon,
  label,
  active = false,
  inactiveClassName = "text-white hover:bg-white/10",
  to,
  onClick,
}: SidebarItemProps) {
  const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    active ? "bg-white/15 font-semibold text-white" : inactiveClassName
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