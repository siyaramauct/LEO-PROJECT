import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type ClassroomTab<T extends string> = {
  id: T;
  label: string;
  icon: ReactNode;
  count?: number;
};

type ClassroomTabsProps<T extends string> = {
  tabs: ClassroomTab<T>[];
  active: T;
  onChange: (tab: T) => void;
  label: string;
};

const tabId = (id: string) => `classroom-tab-${id}`;
const panelId = (id: string) => `classroom-panel-${id}`;

// Pairs with the tab of the same id so screen readers announce which section is shown.
export function ClassroomTabPanel({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={panelId(id)} aria-labelledby={tabId(id)} className={className}>
      {children}
    </div>
  );
}

// Pill-shaped tablist following the WAI-ARIA tabs pattern (roving tabindex, arrow/Home/End keys).
export default function ClassroomTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: ClassroomTabsProps<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    buttonRefs.current[(index + tabs.length) % tabs.length]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusTab(moves[event.key]);
  };

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={isActive}
            aria-controls={panelId(tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${isActive ? "border-violet-700 bg-violet-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
