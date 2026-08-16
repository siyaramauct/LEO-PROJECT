import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from "../src/supabase-client";

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    signup: (email: string, password: string, name: string, surname: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore existing session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Keep session in sync with Supabase auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signup = async (email: string, password: string, name: string, surname: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, surname } },
        });
        if (error) throw error;
        console.log("User signed up successfully");
    };

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log("User logged in successfully");
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("User logged out successfully");
    };

    return (
        <AuthContext.Provider value={{ session, loading, signup, login, logout }}>
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

