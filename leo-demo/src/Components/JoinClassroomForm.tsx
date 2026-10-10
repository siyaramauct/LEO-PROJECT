// -----------------------------------------------------------------------------
// Join Classroom Form
//
// Lets a student join a classroom with the code their teacher shared. The code
// is checked by the join_classroom_with_code database function, which also
// enforces the 30-student limit. On success the student is taken to the classroom.
//
// Used by: StudentClassrooms
// -----------------------------------------------------------------------------

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase-client";

type Props = {
  inputId: string;
  className?: string;
};

export default function JoinClassroomForm({ inputId, className = "" }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  async function joinClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || isJoining) return;

    setIsJoining(true);
    setError("");
    const { data, error: joinError } = await supabase.rpc("join_classroom_with_code", {
      p_code: code.trim(),
    });
    setIsJoining(false);

    if (joinError || !data) {
      setError(joinError?.message ?? "Could not join this classroom.");
      return;
    }

    setCode("");
    navigate(`/student/classrooms/${data}`);
  }

  return (
    <form onSubmit={(event) => void joinClassroom(event)} className={className}>
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
        <KeyRound size={17} className="text-violet-700" /> Join a classroom
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Enter the invitation code your teacher shared with you.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError("");
          }}
          autoComplete="off"
          maxLength={24}
          placeholder="Classroom code"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="submit"
          disabled={!code.trim() || isJoining}
          className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isJoining ? "Joining..." : "Join classroom"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
