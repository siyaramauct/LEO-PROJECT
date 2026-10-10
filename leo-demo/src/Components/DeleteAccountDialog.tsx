import { AlertTriangle } from "lucide-react";

type DeleteDialogProps = {
  open: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  deletingLabel: string;
};

export default function DeleteAccountDialog({
  open,
  isDeleting,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  deletingLabel,
}: DeleteDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white">
          <AlertTriangle size={22} />
        </div>
        <h2 id="delete-dialog-title" className="mt-4 text-base font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? deletingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
