import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
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

function profileNames(user: User) {
    const metadata = user.user_metadata;
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
    const parts = fullName.split(/\s+/).filter(Boolean);
    const emailName = user.email?.split("@")[0] ?? "Learner";
    const suppliedFirstName = typeof metadata.given_name === "string"
        ? metadata.given_name.trim()
        : typeof metadata.first_name === "string"
            ? metadata.first_name.trim()
            : "";
    const firstName = suppliedFirstName === fullName && parts.length > 1
        ? parts[0]
        : suppliedFirstName;

    return {
        name: firstName || parts[0] || metadata.name || emailName,
        surname: metadata.surname || metadata.family_name || parts.slice(1).join(" ") || "",
    };
}

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const fetchProfile = async (user: User): Promise<void> => {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, name, surname, user_role")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Failed to fetch profile:", error);
            setProfile(null);
            setProfileError("Your profile could not be loaded: " + error.message);
            return;
        }

        if (data) {
            setProfile(data);
            setProfileError(null);
            return;
        }

        // A first-time OAuth user may not have a profile trigger in the database.
        const { data: created, error: insertError } = await supabase
            .from("profiles")
            .insert({ id: user.id, ...profileNames(user) })
            .select("id, name, surname, user_role")
            .single();

        if (insertError?.code === "23505") {
            const { data: existing, error: readError } = await supabase
                .from("profiles")
                .select("id, name, surname, user_role")
                .eq("id", user.id)
                .single();
            if (!readError) {
                setProfile(existing);
                setProfileError(null);
                return;
            }
        }
        if (insertError) {
            console.error("Failed to create profile:", insertError);
            setProfile(null);
            setProfileError("Your account signed in, but its profile could not be created: " + insertError.message);
            return;
        }

        setProfile(created);
        setProfileError(null);
    };

    const loadProfile = async (user: User) => {
        setProfileLoading(true);
        setProfileError(null);
        try {
            await fetchProfile(user);
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

        // Keep session in sync with Supabase auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
            if (session?.user) {
                setProfile(null);
                setProfileLoading(true);
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
    }, []);

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
        console.log("User signed up successfully");
        return data.session;
    };

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await loadProfile(data.user);
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
            await loadProfile(session.user);
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
