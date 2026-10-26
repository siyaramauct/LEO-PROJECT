// -----------------------------------------------------------------------------
// Login
//
// Sign in with Google or with email and password. Anyone already signed in is
// sent to "/", which forwards them to the right dashboard. If a Google sign-in
// failed, the reason from the URL is shown above the button.
//
// Route: /login || Access: anyone
// -----------------------------------------------------------------------------

import { Link, Navigate } from "react-router-dom";
import AuthLayout, { AuthDivider } from "../Components/AuthLayout";
import GoogleSignInButton from "../Components/GoogleSignInButton";
import LoginForm from "../Components/LoginForm";
import { useAuth } from "../context/AuthContext";
import { oauthErrorFromUrl } from "../utils/oauthError";

export default function Login() {
  const { session, loading } = useAuth();
  const oauthError = oauthErrorFromUrl();

  if (!loading && session) return <Navigate to="/" replace />;

  return (
    <AuthLayout heading="Welcome back" subheading="Sign in to continue your progress.">
      {oauthError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {oauthError}
        </p>
      )}
      <GoogleSignInButton />

      <AuthDivider label="or sign in with email" />
      <LoginForm />

      <p className="mt-4 text-center text-xs text-gray-400">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-violet-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
