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
// The session comes from Supabase Auth (src/data/auth.ts); the role lives in
// profiles.user_role (accountService). GuardRoute reads both to decide which
// pages a user may open.
// -----------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSavedSession,
  onSessionChange,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "../data/auth";
import type { AccountProfile } from "../data/profiles";
import { loadOrCreateProfile } from "../services/accountService";

// -- Types --------------------------------------------------------------------

type Profile = AccountProfile;

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
      const result = await loadOrCreateProfile(user);
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
        const session = await getSavedSession();
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

    const stopListening = onSessionChange((session) => {
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

    return stopListening;
  }, [loadProfile]);

  // -- Actions --

  const signup = (email: string, password: string, name: string, surname: string) =>
    signUpWithEmail({ email, password, name, surname });

  const login = async (email: string, password: string) => {
    const user = await signInWithEmail(email, password);

    if (user) {
      await loadProfile(user);
    }
  };

  // Leaves the app for Google; the user comes back to "/" and the session
  // listener above picks up the new session.
  const loginWithGoogle = () => signInWithGoogle();

  const logout = () => signOut();

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
