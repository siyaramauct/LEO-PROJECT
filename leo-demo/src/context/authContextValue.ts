import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, surname: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
