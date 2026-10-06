import { Copy, Mail, RefreshCw, Share2, Users } from "lucide-react";
import { useState } from "react";
import { MAX_CLASSROOM_STUDENTS } from "../config/limits";

export type StudentProfile = {
  id: string;
  name: string | null;
  surname: string | null;
  username: string | null;
  user_role: string | null;
};

type Props = {
  classroomName: string;
  code: string | null;
  codeError: string | null;
  students: StudentProfile[];
  rosterError: string | null;
  isRotating: boolean;
  onRotate: () => void;
};

export default function ClassroomInvitePanel({ classroomName, code, codeError, students, rosterError, isRotating, onRotate }: Props) {
  const [shareMessage, setShareMessage] = useState("");
  const invitation = `You're invited to ${classroomName} on LEO Vocabulary App. Sign in, open My Classrooms, and enter this code: ${code}`;
  const isFull = students.length >= MAX_CLASSROOM_STUDENTS;

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setShareMessage("Code copied.");
    } catch {
      setShareMessage("Could not copy the code. Select it to copy manually.");
    }
  };

  const share = async () => {
    if (!code) return;
    if (!navigator.share) {
      await copyCode();
      return;
    }
    try {
      await navigator.share({ title: `Join ${classroomName}`, text: invitation });
      setShareMessage("");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setShareMessage("Sharing failed. Copy the code instead.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Invite students</h2>
          <p className="mt-1 text-sm text-slate-500">{isFull ? "This classroom is full. Remove a student before inviting someone else." : "Share the code privately. Students enter it from My Classrooms."}</p>
        </div>
      </div>
      {code ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="min-w-0 select-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold tracking-wider text-slate-900">{code}</code>
          <button type="button" onClick={() => void copyCode()} title="Copy code" aria-label="Copy classroom code" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"><Copy size={17} /></button>
          {!isFull && <a href={`mailto:?subject=${encodeURIComponent(`Join ${classroomName} on LEO Vocabulary App`)}&body=${encodeURIComponent(invitation)}`} title="Email invitation" aria-label="Email classroom invitation" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"><Mail size={17} /></a>}
          {!isFull && <button type="button" onClick={() => void share()} title="Share invitation" aria-label="Share classroom invitation" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"><Share2 size={17} /></button>}
          <button type="button" onClick={onRotate} disabled={isRotating} title="Create a new code" aria-label="Create a new classroom code" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} /></button>
        </div>
      ) : !codeError && <p className="mt-3 text-sm text-slate-500">Loading invitation code...</p>}
      {codeError && <p role="alert" className="mt-2 text-sm text-red-700">{codeError}</p>}
      {shareMessage && <p role="status" className="mt-2 text-xs text-slate-600">{shareMessage}</p>}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold">Students ({students.length}/{MAX_CLASSROOM_STUDENTS})</h3>
        {rosterError && <p role="alert" className="mt-2 text-xs text-red-700">{rosterError}</p>}
        {students.length === 0 ? <div className="flex items-center gap-2 py-5 text-sm text-slate-500"><Users size={18} /> No students have joined yet.</div> : (
          <div className="mt-2 divide-y divide-slate-100">{students.map((student) => <div key={student.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{`${student.name?.[0] ?? ""}${student.surname?.[0] ?? ""}` || "S"}</span><span><span className="block text-sm font-semibold">{[student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student"}</span>{student.username && <span className="text-xs text-slate-500">@{student.username}</span>}</span></div>)}</div>
        )}
      </div>
    </div>
  );
}
