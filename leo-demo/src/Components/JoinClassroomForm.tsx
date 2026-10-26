// -----------------------------------------------------------------------------
// Join Classroom Form
//
// Lets a student join a classroom with the code their teacher shared, through
// classroomService. The code is checked by the join_classroom_with_code
// database function, which also enforces the 30-student limit. On success the
// student is taken to the classroom.
//
// Used by: StudentClassrooms
// -----------------------------------------------------------------------------

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "../data/errors";
import { joinClassroom } from "../services/classroomService";

type Props = {
  inputId: string;
  className?: string;
};

export default function JoinClassroomForm({ inputId, className = "" }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || isJoining) return;

    setIsJoining(true);
    setError("");

    try {
      const classroomId = await joinClassroom(code);

      setCode("");
      navigate(`/student/classrooms/${classroomId}`);
    } catch (joinError) {
      setError(errorMessage(joinError, "Could not join this classroom."));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleJoin(event)} className={className}>
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
        Join a classroom
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
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-violet-600"
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
