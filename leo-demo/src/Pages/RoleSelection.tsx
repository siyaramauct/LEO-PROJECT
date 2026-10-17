// -----------------------------------------------------------------------------
// Role Selection
//
// Shown once, after a new account is created: the user chooses Student or
// Teacher. Saving the role also gives the user a username, made from their
// name plus three random digits (for example "smij042").
//
// Users who already have a role are sent straight to their dashboard.
//
// Route: /select-role || Access: signed-in users without a role
// -----------------------------------------------------------------------------

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role, type Role as RoleType } from "../context/roles";
import { chooseRole } from "../services/accountService";
import { bucketImageUrl } from "../utils/images";

// -- Role cards ---------------------------------------------------------------

const roles: {
  value: RoleType;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}[] = [
  {
    value: Role.Student,
    title: "Student",
    description:
      "Practice lessons, build vocabulary, and track your progress through guided activities.",
    imageSrc: bucketImageUrl("lessonImgs/travel-illustration.avif"),
    imageAlt: "Student learning from digital English lessons",
  },
  {
    value: Role.Teacher,
    title: "Teacher",
    description:
      "Organize learning paths, guide learners, and manage classroom-focused English practice.",
    imageSrc: bucketImageUrl("lessonImgs/businessEng.avif"),
    imageAlt: "Teacher leading an online English learning session",
  },
];

// -- Page ---------------------------------------------------------------------

export default function RoleSelection() {
  const { session, profile, loading, profileLoading, profileError, refreshProfile } = useAuth();
  const user = session?.user;
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // -- Who may see this page --

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (loading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </main>
    );
  }

  if (profileError || !profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.user_role === Role.Teacher) return <Navigate to="/teacher-dashboard" replace />;
  if (profile.user_role === Role.Student) return <Navigate to="/student/dashboard" replace />;

  // -- Save the role --

  const handleContinue = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setSaveError("");
    try {
      // accountService keeps an existing username or generates a free one.
      await chooseRole({
        userId: user.id,
        role: selectedRole,
        name: profile.name ?? "",
        surname: profile.surname ?? "",
      });

      // Reload the profile so GuardRoute sees the new role, then go to the dashboard.
      await refreshProfile();
      navigate(selectedRole === Role.Student ? "/student/dashboard" : "/teacher-dashboard");
    } catch (error) {
      console.error("Failed to save role:", error);
      setSaveError("Your role could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -- Layout --

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-5 py-10 sm:px-8 lg:h-screen lg:overflow-hidden lg:px-12 lg:py-10">
      <header className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.24em] text-violet-600">ACCOUNT SETUP</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          How will you use the platform?
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose the role that matches your goals. You can always update this later.
        </p>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-5xl flex-1 flex-col gap-5 sm:mt-10 sm:flex-row lg:mt-8 lg:min-h-0 lg:gap-6">
        {roles.map(({ value, title, description, imageSrc, imageAlt }) => {
          const isSelected = selectedRole === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedRole(value)}
              className={`group flex flex-1 flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-violet-500 shadow-lg shadow-violet-100"
                  : "border-slate-200 hover:border-violet-300"
              }`}
            >
              <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-52 lg:h-0 lg:flex-[1.4]">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className={`h-full w-full object-cover transition-opacity duration-500 ${
                    isSelected ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                  }`}
                />
                {isSelected && (
                  <span className="absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>

              <div className="flex flex-col p-6 lg:flex-[0.6] lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
                </div>

                <span
                  className={`mt-6 inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-500 ${
                    isSelected
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-600 text-violet-700 group-hover:bg-violet-600 group-hover:text-white"
                  }`}
                >
                  {isSelected ? `✓ ${title} selected` : `Continue as ${title}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-6 w-full max-w-5xl lg:mt-5 lg:flex lg:justify-center">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedRole || saving}
          className="w-full lg:w-64 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold tracking-wide text-white border border-violet-600 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-violet-600"
        >
          {saving
            ? "Saving..."
            : selectedRole
              ? `Continue as ${roles.find((r) => r.value === selectedRole)?.title}`
              : "Select a role to continue"}
        </button>
        {saveError && (
          <p role="alert" className="mt-3 text-center text-sm text-red-700">
            {saveError}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 lg:mt-4">
        &copy; 2026 Learn English Online
      </p>
    </div>
  );
}
