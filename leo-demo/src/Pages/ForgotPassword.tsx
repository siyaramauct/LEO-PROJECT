// -----------------------------------------------------------------------------
// Forgot Password
//
// Asks for an email address and has Supabase send a password-reset link. The
// link opens /reset-password. The confirmation message is the same whether or
// not the account exists, so the page can't be used to check who is registered.
//
// Route: /forgot-password || Access: anyone
// -----------------------------------------------------------------------------

import { ArrowLeft, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "../data/auth";
import { authErrorMessage } from "../data/errors";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function sendRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setError("");

    try {
      await sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (recoveryError) {
      setError(
        authErrorMessage(recoveryError, "The reset email couldn't be sent. Please try again."),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <Mail size={21} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your email address and we'll send you a secure password-reset link.
        </p>

        {sent ? (
          <div className="mt-5">
            <p
              role="status"
              className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
            >
              If an account exists for that email address, a reset link has been sent. Check your
              inbox and spam folder.
            </p>
            <Link
              to="/login"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
            >
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(event) => void sendRecoveryEmail(event)} className="mt-5">
            <label htmlFor="recovery-email" className="block text-sm font-semibold text-slate-800">
              Email address
            </label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              autoComplete="email"
              required
              autoFocus
              placeholder="jane@example.com"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-600"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSending}
              className="mt-5 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send reset link"}
            </button>
            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-violet-700"
            >
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
