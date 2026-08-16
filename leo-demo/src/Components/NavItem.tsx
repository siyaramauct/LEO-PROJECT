import type { ReactNode } from "react";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
};

export default function NavItem({ icon, label, active = false }: NavItemProps) {
  return (
    <button
      className={`flex flex-col items-center gap-1 text-[10px] ${
        active ? "font-semibold text-violet-700" : "text-slate-400"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}