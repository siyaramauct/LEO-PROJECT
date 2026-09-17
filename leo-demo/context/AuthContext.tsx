import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from "../src/supabase-client";

interface Profile {
    id: string;
    name: string;
    surname: string;
    user_role: string | null;
}

interface AuthContextType {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    profileLoading: boolean;
    profileError: string | null;
    signup: (email: string, password: string, name: string, surname: string) => Promise<Session | null>;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Fetches the profile row. If it doesn't exist yet (e.g. a DB trigger
    // hasn't finished creating it right after signup), retries a few times
    // with a short delay instead of failing immediately.
    const fetchProfile = async (userId: string, attempt = 0): Promise<void> => {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, name, surname, user_role")
            .eq("id", userId)
            .single();

        if (error) {
            // PGRST116 = no rows found — expected right after signup
            // if the profile row is created by a trigger with slight delay
            if (error.code === "PGRST116" && attempt < 5) {
                await new Promise((res) => setTimeout(res, 500));
                return fetchProfile(userId, attempt + 1);
            }
            console.error("Failed to fetch profile:", error);
            setProfile(null);
            setProfileError(error.code === "PGRST116" ? "Your profile record could not be found. Please contact support." : "Your profile could not be loaded. Please refresh and try again.");
            return;
        }

        setProfile(data);
        setProfileError(null);
    };

    const loadProfile = async (userId: string) => {
        setProfileLoading(true);
        setProfileError(null);
        try {
            await fetchProfile(userId);
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        // Restore existing session on mount
        const restoreSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if (session?.user) {
                    setProfile(null);
                    await loadProfile(session.user.id);
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

        // Keep session in sync with Supabase auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
            if (session?.user) {
                setProfile(null);
                setProfileLoading(true);
                setTimeout(() => {
                    void loadProfile(session.user.id);
                }, 0);
            } else {
                setProfile(null);
                setProfileLoading(false);
                setProfileError(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signup = async (email: string, password: string, name: string, surname: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, surname } },
        });
        if (error) throw error;
        console.log("User signed up successfully");
        return data.session;
    };

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await loadProfile(data.user.id);
        console.log("User logged in successfully");
    };

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
        console.log("User logged out successfully");
    };

    const refreshProfile = async () => {
        if (session?.user) {
            await loadProfile(session.user.id);
        }
    };

    return (
        <AuthContext.Provider
            value={{ session, profile, loading, profileLoading, profileError, signup, login, loginWithGoogle, logout, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthContextProvider');
    }
    return context;
};
