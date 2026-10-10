import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase-client";
import { AuthContext } from "./authContextValue";

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const signup = async (email: string, password: string, name: string, surname: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, surname },
      },
    });

    if (error) throw error;
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
