import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

  type Profile = { name: string; surname: string; user_role: string | null }

export default function Home() {
  const { session, loading } = useAuth();
  const user = session?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    supabase
      .from("profiles")
      .select("name, surname, user_role")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        setProfile(data);
        setProfileLoading(false);
      });
  }, [user]);

  if (loading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">Home</h1>
        <div className="mt-6 space-y-3 text-lg">
          <p>
            <span className="font-semibold">Name:</span>{" "}
            {`${profile?.name} ${profile?.surname}`}
          </p>
          <p>
            <span className="font-semibold">Role:</span>{" "}
            {profile?.user_role ?? "No role assigned"}
          </p>
        </div>
      </div>
    </main>
  );
}
