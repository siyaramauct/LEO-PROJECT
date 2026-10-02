import { FileText, Link as LinkIcon, Paperclip, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { ClassroomMaterial } from "./ClassroomMaterialsPanel";

type ClassroomMaterialsTimelineProps = {
  materials: ClassroomMaterial[];
  onFileUpload: (file: File) => Promise<void>;
  onAddLink: (url: string) => Promise<void>;
  onDeleteMaterial: (material: ClassroomMaterial) => void;
  isSaving?: boolean;
  error?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Buckets are relative to local midnight so "Today" matches the teacher's calendar day.
const groupLabel = (uploaded: Date, now: Date) => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = uploaded.getTime();
  if (time >= startOfToday) return "Today";
  if (time >= startOfToday - DAY_MS) return "Yesterday";
  if (time >= startOfToday - 6 * DAY_MS) return "This week";
  if (uploaded.getFullYear() === now.getFullYear() && uploaded.getMonth() === now.getMonth()) return "Earlier this month";
  return uploaded.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const groupMaterials = (materials: ClassroomMaterial[]) => {
  const now = new Date();
  const groups: { label: string; items: ClassroomMaterial[] }[] = [];
  for (const material of materials) {
    const label = material.uploadedDate ? groupLabel(new Date(material.uploadedDate), now) : "Undated";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(material);
    else groups.push({ label, items: [material] });
  }
  return groups;
};

const formatTimestamp = (value?: string) =>
  value ? new Date(value).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// Desktop materials feed: composer on top, newest uploads first, grouped by date.
export default function ClassroomMaterialsTimeline({
  materials,
  onFileUpload,
  onAddLink,
  onDeleteMaterial,
  isSaving = false,
  error,
}: ClassroomMaterialsTimelineProps) {
  const uploadInputId = useId();
  const [url, setUrl] = useState("");
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);

  const submitLink = async () => {
    if (!url.trim()) return;
    await onAddLink(url.trim());
    setUrl("");
    setIsLinkFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Share with the class</h2>
            <p className="mt-1 text-sm text-slate-500">Students are notified when you post a document or link.</p>
          </div>
          <div className="flex gap-2">
            <label
              htmlFor={uploadInputId}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${isSaving ? "cursor-not-allowed bg-slate-300" : "cursor-pointer bg-violet-700 hover:bg-violet-800"}`}
            >
              <Paperclip size={15} />
              {isSaving ? "Saving..." : "Upload PDF"}
            </label>
            <input
              id={uploadInputId}
              type="file"
              className="sr-only"
              accept="application/pdf,.pdf"
              disabled={isSaving}
              onChange={(event) => {
                const [file] = Array.from(event.target.files ?? []);
                if (file) void onFileUpload(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={isSaving}
              aria-expanded={isLinkFormOpen}
              onClick={() => setIsLinkFormOpen((isOpen) => !isOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} /> Add link
            </button>
          </div>
        </div>

        {isLinkFormOpen && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLink();
            }}
          >
            <input
              type="url"
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a URL"
              aria-label="Link to share"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={!url.trim() || isSaving}
              className="rounded-lg bg-violet-700 px-4 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {isSaving ? "Saving" : "Share"}
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      </section>

      {materials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          Nothing shared yet. Upload a document or add a link above.
        </p>
      ) : (
        groupMaterials(materials).map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</h3>
            <ol className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
              {group.items.map((material) => {
                const Icon = material.kind === "Link" ? LinkIcon : FileText;
                return (
                  <li key={material.id} className="group flex items-center gap-3 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center text-violet-700">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {material.url ? (
                        <a href={material.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-slate-800 hover:text-violet-700 hover:underline">
                          {material.title}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-semibold text-slate-800">{material.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {material.detail}
                        {material.uploadedDate && <> · <time dateTime={material.uploadedDate}>{formatTimestamp(material.uploadedDate)}</time></>}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${material.title}`}
                      onClick={() => onDeleteMaterial(material)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
