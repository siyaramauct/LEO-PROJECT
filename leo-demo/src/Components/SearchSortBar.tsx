// -----------------------------------------------------------------------------
// Search and Sort Bar
//
// A search box with a clear button, next to a sort menu. It only renders the
// controls: the parent page holds the query and sort state and does the actual
// filtering with the helpers in utils/listControls.ts.
//
// Stacks vertically on phones and sits on one row from sm up.
//
// Used by: TeacherClassroom || ClassroomStudentsTab || ClassroomInvitePanel
// -----------------------------------------------------------------------------

import { ArrowUpDown, Search, X } from "lucide-react";
import { useId } from "react";
import type { SortOption } from "../utils/listControls";

type SearchSortBarProps<T extends string> = {
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  sort: T;
  onSortChange: (sort: T) => void;
  sortOptions: SortOption<T>[];
  size?: "sm" | "md"; // "sm" for compact mobile cards, "md" for desktop pages.
  className?: string;
};

export default function SearchSortBar<T extends string>({
  query,
  onQueryChange,
  searchPlaceholder,
  sort,
  onSortChange,
  sortOptions,
  size = "md",
  className = "",
}: SearchSortBarProps<T>) {
  const sortId = useId();
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}>
      <div className="relative min-w-0 flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={`h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 ${text} outline-none transition placeholder:text-slate-400 focus:border-violet-600 [&::-webkit-search-cancel-button]:hidden`}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="relative shrink-0">
        <label htmlFor={sortId} className="sr-only">
          Sort by
        </label>
        <ArrowUpDown
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <select
          id={sortId}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as T)}
          className={`h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white pl-9 pr-8 ${text} text-slate-700 outline-none transition focus:border-violet-600 sm:w-auto`}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
