import type { ReactNode } from "react";

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  inactiveClassName?: string;
};

export default function SidebarItem({
  icon,
  label,
  active = false,
  inactiveClassName = "text-white hover:bg-white/10",
}: SidebarItemProps) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-white/15 font-semibold text-white"
          : inactiveClassName
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}