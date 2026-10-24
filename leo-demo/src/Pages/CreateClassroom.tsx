// -----------------------------------------------------------------------------
// Create Classroom
//
// The page around ClassroomForm. The phone and tablet layout puts a violet
// banner above the form; the desktop layout puts the form beside the sidebar.
// Both render their own copy of the form, so each gets an id prefix to keep
// input ids unique.
//
// Route: /create-classroom || Access: teachers
// -----------------------------------------------------------------------------

import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ClassroomForm from "../Components/ClassroomForm";
import NotificationBell from "../Components/NotificationBell";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";
import UserIdentity from "../Components/UserIdentity";
import { bucketImageUrl } from "../utils/images";

export default function CreateClassroom() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {
        // -- Phone and tablet layout (under 1024px) --
      }
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-nav-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link
            to="/TeacherClassroom"
            aria-label="Back to classrooms"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </Link>
          <NotificationBell />
        </header>

        <main className="flex-1 px-4 pb-5 sm:px-6">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-8 h-10 w-24 rounded-t-full bg-white/10" />
            <div className="relative pr-20">
              <p className="text-xs font-medium text-white">Teacher Portal</p>
              <h1 className="mt-2 text-xl font-bold">Create a classroom</h1>
              <p className="mt-1 text-xs text-white">Set up a focused space for your learners.</p>
            </div>
            <div className="absolute inset-y-0 right-0 w-20 overflow-hidden bg-white">
              <img
                src={bucketImageUrl("classroomImgs/classRoomIllustration.png")}
                alt="Classroom illustration"
                className="block h-full w-full object-cover"
              />
            </div>
          </section>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-4">
            <ClassroomForm idPrefix="mobile" />
          </section>
        </main>

        <TeacherBottomNav active="classes" />
      </div>

      {
        // -- Desktop layout (1024px and up) --
      }
      <div className="hidden min-h-dvh lg:flex">
        <TeacherSidebar active="classes" />

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/TeacherClassroom"
                aria-label="Back to classrooms"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft size={19} />
              </Link>
              <div>
                <p className="text-xs font-medium text-violet-700">Teacher Portal</p>
                <h1 className="mt-1 text-xl font-bold">Create a classroom</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserIdentity />
            </div>
          </header>

          <div className="mx-auto w-full max-w-5xl p-5">
            <section className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="mb-5">
                <h2 className="text-lg font-bold">Classroom details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Give your learners clear context before they join.
                </p>
              </div>
              <ClassroomForm idPrefix="desktop" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
