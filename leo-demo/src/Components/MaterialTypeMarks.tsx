// Visual markers for classroom materials: a left spine (solid for documents,
// dashed for links) and an outlined type tag such as "PDF" or "LINK".
export function MaterialSpine({ isLink }: { isLink: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-0 shrink-0 self-stretch border-l-2 ${isLink ? "border-dashed border-violet-300" : "border-violet-700"}`}
    />
  );
}

export function MaterialTypeTag({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded border border-violet-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wider text-violet-700">
      {label}
    </span>
  );
}
