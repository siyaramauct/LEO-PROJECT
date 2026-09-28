import { FileText, Link as LinkIcon, Paperclip, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export type ClassroomMaterial = {
  id: string;
  title: string;
  kind: "Document" | "Link";
  detail: string;
  url?: string;
  resourceType: "document" | "link";
  resourcePath: string;
  uploadedDate?: string;
};

// Parent-owned callbacks keep this panel reusable with any materials store.
type ClassroomMaterialsPanelProps = {
  materials: ClassroomMaterial[];
  onFileUpload: (file: File) => Promise<void>;
  onAddLink: (url: string) => Promise<void>;
  onDeleteMaterial: (material: ClassroomMaterial) => void;
  isSaving?: boolean;
  error?: string | null;
};

export default function ClassroomMaterialsPanel({
  materials,
  onFileUpload,
  onAddLink,
  onDeleteMaterial,
  isSaving = false,
  error,
}: ClassroomMaterialsPanelProps) {
  // Link-entry state belongs to the panel because it is only needed while editing.
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [url, setUrl] = useState("");

  const submitLink = async () => {
    if (!url.trim()) {
      return;
    }

    await onAddLink(url.trim());
    setUrl("");
    setIsLinkFormOpen(false);
  };

  return (
    <section className="rounded-xl border border-slate-100 bg-white p-3">
      {/* Panel heading and current material count */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Class materials</h2>
          <p className="mt-1 text-xs text-slate-500">Files and links shared with learners.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {materials.length} items
        </span>
      </div>

      {/* Document picker and URL-entry trigger */}
      <div className="mt-3 flex gap-2">
        <label
          htmlFor="classroom-material-upload"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${isSaving ? "cursor-not-allowed bg-slate-300" : "cursor-pointer bg-violet-700 hover:bg-violet-800"}`}
        >
          <Paperclip size={15} />
          {isSaving ? "Saving..." : "Upload PDF"}
        </label>
        <input
          id="classroom-material-upload"
          type="file"
          className="sr-only"
          accept="application/pdf,.pdf"
          disabled={isSaving}
          onChange={(event) => {
            const [file] = Array.from(event.target.files ?? []);
            if (file) {
              void onFileUpload(file);
            }
            event.target.value = "";
          }}
        />

        <button
          type="button"
          aria-label="Add a material link"
          disabled={isSaving}
          onClick={() => setIsLinkFormOpen((isOpen) => !isOpen)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
        </button>
      </div>

      {/* The URL form is only shown when the teacher adds an external resource. */}
      {isLinkFormOpen && (
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submitLink();
              }
            }}
            placeholder="Paste a URL"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="button"
            onClick={() => void submitLink()}
            disabled={!url.trim() || isSaving}
            className="rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {isSaving ? "Saving" : "Add"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

      {/* Existing classroom resources */}
      <div className="mt-3 divide-y divide-slate-100">
        {materials.map((material) => {
          const Icon = material.kind === "Link" ? LinkIcon : FileText;
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-violet-700">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{material.title}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">{material.detail}</p>
              </div>
            </>
          );

          return (
            <div key={material.id} className="flex items-center gap-2 py-2.5">
              {material.url ? (
                <a href={material.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 transition hover:bg-slate-50">
                  {content}
                </a>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2">{content}</div>
              )}
              <button
                type="button"
                aria-label={`Delete ${material.title}`}
                onClick={() => onDeleteMaterial(material)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
