import { LockKeyhole, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";

type Props = { onClose: () => void };

export default function ChangePasswordDialog({ onClose }: Props) {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const providers = session?.user.app_metadata?.providers as string[] | undefined;
  const isGoogleOnly = providers?.includes("google") && !providers.includes("email");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSaving) onClose();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center text-violet-700">
            <LockKeyhole size={20} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close password settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="change-password-title" className="mt-4 text-lg font-bold text-slate-900">
          Password and security
        </h2>
        {isGoogleOnly ? (
          <div className="mt-3 text-sm text-slate-600">
            <p>This account signs in with Google and has no LEO email password to change.</p>
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-semibold text-violet-700 underline underline-offset-2"
            >
              Open Google security settings
            </a>
          </div>
        ) : success ? (
          <div className="mt-4">
            <p
              role="status"
              className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800"
            >
              Your password has been changed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void changePassword(event)} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-semibold text-slate-800"
              >
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-slate-800">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-slate-800"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Updating..." : "Change password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
