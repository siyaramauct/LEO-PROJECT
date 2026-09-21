import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

export default function ResetPassword() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setIsSaving(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setIsSaving(false);
    setComplete(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><LockKeyhole size={21} /></div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Choose a new password</h1>

        {complete ? (
          <div className="mt-5">
            <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your password has been reset. You can now sign in with your new password.</p>
            <Link to="/login" className="mt-5 block rounded-lg bg-violet-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-800">Sign in</Link>
          </div>
        ) : loading ? (
          <p className="mt-4 text-sm text-slate-500">Checking your reset link...</p>
        ) : !session ? (
          <div className="mt-4">
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">This reset link is invalid or has expired. Request a new one to continue.</p>
            <Link to="/forgot-password" className="mt-5 block rounded-lg bg-violet-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-800">Request another link</Link>
          </div>
        ) : (
          <form onSubmit={(event) => void resetPassword(event)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="recovery-password" className="block text-sm font-semibold text-slate-800">New password</label>
              <input id="recovery-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="new-password" minLength={8} required autoFocus className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100" />
            </div>
            <div>
              <label htmlFor="recovery-confirmation" className="block text-sm font-semibold text-slate-800">Confirm new password</label>
              <input id="recovery-confirmation" type="password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} autoComplete="new-password" minLength={8} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={isSaving} className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Resetting..." : "Reset password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
