import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Inputs = {
  email: string;
  password: string;
};

const field =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100";

const label = "block text-sm font-bold text-gray-700 mb-1.5";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const { login } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setAuthError(null);
    setSaving(true);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Invalid email or password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Email */}
      <div>
        <label htmlFor="email" className={label}>
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="jane@example.com"
          className={field}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
        />
        {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Your password"
          className={field}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        {errors.password && (
          <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>
        )}
        <div className="mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-[11px] text-violet-600 font-semibold hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Submit */}
      {authError && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[12px] text-red-600">{authError}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold tracking-wide text-white border border-violet-600 transition hover:bg-white hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
