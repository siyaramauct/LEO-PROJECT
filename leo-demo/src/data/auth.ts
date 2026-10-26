// -----------------------------------------------------------------------------
// Auth
//
// Signing in and out, sessions and passwords, through Supabase Auth.
//
// Unlike the rest of src/data, these functions throw Supabase's own auth
// errors unchanged, so the forms can read their error codes. The forms turn
// them into plain messages with authErrorMessage (src/data/errors.ts).
// -----------------------------------------------------------------------------

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-client";

// The session saved in this browser from an earlier visit, if any.
export async function getSavedSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();

  return data.session;
}

// Calls back on every sign-in, sign-out, token refresh and return from
// Google. Returns a function that stops listening.
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));

  return () => data.subscription.unsubscribe();
}

type NewAccount = {
  email: string;
  password: string;
  name: string;
  surname: string;
};

// Null when the project requires email confirmation before first sign-in.
export async function signUpWithEmail({
  email,
  password,
  name,
  surname,
}: NewAccount): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, surname },
      emailRedirectTo: window.location.origin + "/",
    },
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data.user;
}

// Leaves the app for Google; the user comes back to "/" and onSessionChange
// picks up the new session.
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/" },
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// Supabase checks currentPassword before applying the change. Leave it out
// only on the reset-password page, where the recovery link proves who it is.
export async function updatePassword(newPassword: string, currentPassword?: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });

  if (error) {
    throw error;
  }
}

// Emails a link that opens /reset-password with a recovery session.
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw error;
  }
}
