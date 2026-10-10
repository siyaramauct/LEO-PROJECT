// -----------------------------------------------------------------------------
// Auth Context
//
// The app-wide source of truth for who is signed in. It wraps the whole app
// (see main.tsx) and gives every component, through useAuth():
//
//   session          the Supabase session, or null when signed out
//   profile          the user's row from the profiles table (name, role)
//   loading          true until the saved session has been checked on start-up
//   profileLoading   true while the profile is being fetched
//   profileError     a readable message if the profile could not be loaded
//
// and the actions signup, login, loginWithGoogle, logout and refreshProfile.
//
// The session comes from Supabase Auth; the role lives in profiles.user_role.
// GuardRoute reads both to decide which pages a user may open.
// -----------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-client";

// -- Types --------------------------------------------------------------------

interface Profile {
  id: string;
  name: string;
  surname: string;
  user_role: string | null; // Null until the user picks a role on /select-role.
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  signup: (
    email: string,
    password: string,
    name: string,
    surname: string,
  ) => Promise<Session | null>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_COLUMNS = "id, name, surname, user_role";

// -- Profile loading ----------------------------------------------------------

// Works out a first name and surname from whatever the sign-in provider sent.
// Google sends a full name plus given and family names; email signups send
// name and surname directly.
function profileNames(user: User) {
  const metadata = user.user_metadata;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const parts = fullName.split(/\s+/).filter(Boolean);
  const emailName = user.email?.split("@")[0] ?? "Learner";

  const suppliedFirstName =
    typeof metadata.given_name === "string"
      ? metadata.given_name.trim()
      : typeof metadata.first_name === "string"
        ? metadata.first_name.trim()
        : "";

  // Some providers put the whole name in given_name; keep only the first word then.
  const firstName =
    suppliedFirstName === fullName && parts.length > 1 ? parts[0] : suppliedFirstName;

  return {
    name: firstName || parts[0] || metadata.name || emailName,
    surname: metadata.surname || metadata.family_name || parts.slice(1).join(" ") || "",
  };
}

// Reads the user's profile row, creating it if it doesn't exist yet.
// Returns either the profile or a message explaining what went wrong.
async function fetchOrCreateProfile(
  user: User,
): Promise<{ profile: Profile | null; error: string | null }> {
  // 1. Normal case: the profile already exists.
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile:", error);
    return { profile: null, error: "Your profile could not be loaded: " + error.message };
  }
  if (data) return { profile: data, error: null };

  // 2. A first-time Google user may arrive before any database trigger has
  //    created their profile, so create it here.
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: user.id, ...profileNames(user) })
    .select(PROFILE_COLUMNS)
    .single();

  // 3. Error 23505 means the row was created in the meantime (a race with the
  //    trigger), so read it again instead of failing.
  if (insertError?.code === "23505") {
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .single();
    if (!readError) return { profile: existing, error: null };
  }

  if (insertError) {
    console.error("Failed to create profile:", insertError);
    return {
      profile: null,
      error: "Your account signed in, but its profile could not be created: " + insertError.message,
    };
  }

  return { profile: created, error: null };
}

// -- Provider -----------------------------------------------------------------

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (user: User) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const result = await fetchOrCreateProfile(user);
      setProfile(result.profile);
      setProfileError(result.error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Session tracking. Runs once when the app starts.
  //
  // First, restore any session saved in the browser from a previous visit.
  // Then subscribe to Supabase auth events (sign in, sign out, token refresh,
  // returning from Google) so the session stays current for the rest of the visit.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          setProfile(null);
          await loadProfile(session.user);
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      if (session?.user) {
        setProfile(null);
        setProfileLoading(true);
        // Supabase advises against awaiting other Supabase calls inside this
        // callback (it can deadlock), so the profile load is deferred a tick.
        setTimeout(() => {
          void loadProfile(session.user);
        }, 0);
      } else {
        setProfile(null);
        setProfileLoading(false);
        setProfileError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // -- Actions --

  const signup = async (email: string, password: string, name: string, surname: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, surname },
        emailRedirectTo: window.location.origin + "/",
      },
    });
    if (error) throw error;

    // Null when the project requires email confirmation before first sign-in.
    return data.session;
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await loadProfile(data.user);
  };

  // Leaves the app for Google; the user comes back to "/" and the auth
  // listener above picks up the new session.
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Re-reads the profile, e.g. after the user picks a role.
  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoading,
        profileError,
        signup,
        login,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// -- Hook ---------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};
