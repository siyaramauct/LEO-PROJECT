// -----------------------------------------------------------------------------
// Profile Content
//
// The body of the profile page for both students and teachers: a banner with
// the user's initials, their personal details, a password section, a danger
// zone for deleting the account, and a log out button.
//
// The role prop switches the few things that differ: the banner wording and
// the username field (students only).
//
// The page that renders this owns the logout and delete actions; this
// component only owns its two popups, ConfirmDialog and ChangePasswordDialog.
//
// Used by: StudentProfile || TeacherProfile
// -----------------------------------------------------------------------------

import { LockKeyhole, LogOut, Trash2, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import ChangePasswordDialog from "./ChangePasswordDialog";
import ConfirmDialog from "./ConfirmDialog";

type ProfileContentProps = {
  role: "student" | "teacher";
  fullName: string;
  username?: string | null; // Shown for students only.
  initials: string;
  loggingOut: boolean;
  onLogout: () => Promise<void>;
  deletingAccount: boolean;
  onDeleteAccount: () => Promise<void>;
};

export default function ProfileContent({
  role,
  fullName,
  username = null,
  initials,
  loggingOut,
  onLogout,
  deletingAccount,
  onDeleteAccount,
}: ProfileContentProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const isStudent = role === "student";
  const [firstName, ...otherNames] = fullName.split(" ");

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-violet-700 p-5 text-white shadow-lg shadow-violet-100 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-violet-700">
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              {isStudent ? "Student account" : "Teacher account"}
            </p>
            <h3 className="mt-1 text-xl font-bold">{fullName}</h3>
            <p className="mt-1 text-sm text-violet-100">
              {isStudent ? `@${username ?? "student"}` : "Your learning workspace"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <User size={19} className="text-violet-700" />
          <div>
            <h3 className="font-bold">Personal information</h3>
            <p className="mt-1 text-sm text-slate-500">Your account details are shown below.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField
            label="First name"
            value={firstName || (isStudent ? "Student" : "Teacher")}
          />
          <ProfileField label="Last name" value={otherNames.join(" ") || "Not provided"} />
          {isStudent && <ProfileField label="Username" value={username ?? "Not assigned"} />}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="font-bold">Change password</h3>
        <div className="mt-4 divide-y divide-slate-100">
          <ProfileOption
            icon={<LockKeyhole size={18} />}
            title="Password and security"
            description="Update your sign-in details"
            onClick={() => setShowPasswordDialog(true)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="font-bold">Danger zone</h3>
        <p className="mt-1 text-sm text-slate-500">
          Permanently delete your account and profile data.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-600 hover:bg-rose-600 hover:text-white"
        >
          <Trash2 size={18} />
          Delete account
        </button>
      </section>

      <button
        type="button"
        onClick={() => void onLogout()}
        disabled={loggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:border-rose-600 hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rose-200 disabled:hover:bg-white disabled:hover:text-rose-600"
      >
        <LogOut size={18} />
        {loggingOut ? "Logging out..." : "Log out"}
      </button>

      <ConfirmDialog
        open={showDeleteDialog}
        isDeleting={deletingAccount}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={() => void onDeleteAccount()}
        title="Delete your account?"
        description="This will permanently remove your account and profile data. This action cannot be undone."
        confirmLabel="Delete account"
        deletingLabel="Deleting..."
      />
      {showPasswordDialog && <ChangePasswordDialog onClose={() => setShowPasswordDialog(false)} />}
    </div>
  );
}

// -- Small building blocks ----------------------------------------------------

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

type ProfileOptionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
};

function ProfileOption({ icon, title, description, onClick }: ProfileOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-4 text-left"
    >
      <span className="text-violet-700">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </span>
      <span className="text-lg text-slate-300">›</span>
    </button>
  );
}
