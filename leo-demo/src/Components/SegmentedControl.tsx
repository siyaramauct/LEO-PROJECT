// -----------------------------------------------------------------------------
// Segmented Control
//
// A row of small toggle buttons for choosing one option, such as a sort order.
// When the options don't fit (on phones, or with long labels), they wrap onto
// another line, so no option is ever cut off or hidden off-screen.
//
// Used by: ClassroomReport || StudentLearningReport
// -----------------------------------------------------------------------------

type SegmentedControlProps<T extends string> = {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
};

export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-slate-100 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
