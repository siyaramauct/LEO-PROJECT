// -----------------------------------------------------------------------------
// Sign Up
//
// Create an account with Google or with email and password. Anyone already
// signed in is sent to "/". New users pick their role on the next screen.
//
// Route: /signup || Access: anyone
// -----------------------------------------------------------------------------

import { Link, Navigate } from "react-router-dom";
import AuthLayout, { AuthDivider } from "../Components/AuthLayout";
import GoogleSignInButton from "../Components/GoogleSignInButton";
import SignupForm from "../Components/SignupForm";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const { session, loading } = useAuth();

  if (!loading && session) return <Navigate to="/" replace />;

  return (
    <AuthLayout heading="Create your account" subheading="Start your language journey today.">
      <GoogleSignInButton />

      <AuthDivider label="or sign up with email" />
      <SignupForm />

      <p className="mt-4 text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-violet-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
