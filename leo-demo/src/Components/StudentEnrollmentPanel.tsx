import { MoreVertical, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";

export type StudentProfile = {
  id: string;
  name: string | null;
  surname: string | null;
  username: string | null;
  user_role: string | null;
};

type StudentEnrollmentPanelProps = {
  students: StudentProfile[];
  searchTerm: string;
  searchResults: StudentProfile[];
  selectedStudent: StudentProfile | null;
  isSearching: boolean;
  isEnrolling: boolean;
  error: string | null;
  onSearchTermChange: (searchTerm: string) => void;
  onSearch: () => void;
  onStudentSelect: (student: StudentProfile) => void;
  onStudentCancel: () => void;
  onEnroll: () => void;
  onRemoveStudent: (student: StudentProfile) => void;
};

export default function StudentEnrollmentPanel({
  students,
  searchTerm,
  searchResults,
  selectedStudent,
  isSearching,
  isEnrolling,
  error,
  onSearchTermChange,
  onSearch,
  onStudentSelect,
  onStudentCancel,
  onEnroll,
  onRemoveStudent,
}: StudentEnrollmentPanelProps) {
  const [openMenuStudentId, setOpenMenuStudentId] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><h2 className="text-base font-bold">Students</h2><p className="mt-1 text-sm text-slate-500">{students.length} enrolled</p></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input value={searchTerm} disabled={isSearching} onChange={(event) => onSearchTermChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="Search username" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 sm:w-52" aria-label="Search students by username" />
          <button type="button" disabled={!searchTerm.trim() || isSearching} onClick={onSearch} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{isSearching ? "Searching..." : "Search"}</button>
        </div>
      </div>
      {!selectedStudent && searchResults.length > 0 && <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">{searchResults.map((student) => <button key={student.id} type="button" onClick={() => onStudentSelect(student)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{[student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student"}</span><span className="mt-1 block text-xs text-slate-500">@{student.username}</span></span><span className="text-xs font-semibold text-violet-700">Select</span></button>)}</div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {students.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><Users size={24} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No students enrolled yet</p><p className="mt-1 text-xs text-slate-400">Search for a student by username to add them to this classroom.</p></div> : <div className="mt-4 divide-y divide-slate-100">{students.map((student) => <div key={student.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{`${student.name?.[0] ?? ""}${student.surname?.[0] ?? ""}` || "S"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{[student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student"}</span>{student.username && <span className="mt-1 block text-xs text-slate-500">@{student.username}</span>}</span><div className="relative shrink-0"><button type="button" aria-label="Student options" aria-expanded={openMenuStudentId === student.id} onClick={() => setOpenMenuStudentId((current) => (current === student.id ? null : student.id))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"><MoreVertical size={18} /></button>{openMenuStudentId === student.id && <div className="absolute right-0 top-9 z-10 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" onClick={() => { setOpenMenuStudentId(null); onRemoveStudent(student); }} className="flex w-full items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"><UserMinus size={14} /> Remove from classroom</button></div>}</div></div>)}</div>}
      {selectedStudent && <div role="dialog" aria-modal="true" aria-label="Add student to classroom" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"><p className="text-xs font-medium text-violet-700">Student found</p><h3 className="mt-2 text-lg font-bold text-slate-900">Add this student?</h3><div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{[selectedStudent.name, selectedStudent.surname].filter(Boolean).join(" ") || "Unnamed student"}</p><p className="mt-1 text-sm text-slate-500">@{selectedStudent.username}</p></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isEnrolling} onClick={onStudentCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button><button type="button" disabled={isEnrolling} onClick={onEnroll} className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"><UserPlus size={16} /> {isEnrolling ? "Adding..." : "Add student"}</button></div></div></div>}
    </>
  );
}
