import { useAuth } from "../context/AuthContext";

export default function UserIdentity() {
  const { profile } = useAuth();
  const teacherName = profile?.name || "Teacher";
  const initial = teacherName[0].toUpperCase();
  const role = profile?.user_role
    ? profile.user_role[0].toUpperCase() + profile.user_role.slice(1)
    : "Teacher";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">
        {initial}
      </div>
      <div>
        <p className="text-sm font-semibold">{teacherName}</p>
        <p className="text-xs text-slate-400">{role}</p>
      </div>
    </div>
  );
}
