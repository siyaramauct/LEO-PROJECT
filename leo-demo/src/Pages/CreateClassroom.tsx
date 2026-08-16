import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  Home,
  Layers,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import ClassroomFormField from "../Components/ClassroomFormField";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";

const coverOptions = [
  { id: "everyday", image: "/fetchbook.jpg", alt: "Learner studying from a book" },
  { id: "reading", image: "/libIl.jpg", alt: "Library illustration" },
  { id: "digital", image: "/Nerd-amico.png", alt: "Learner using a laptop" },
];

const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100";

type ClassroomFormValues = {
  name: string;
  description: string;
  proficiencyLevel: string;
  language: string;
  coverId: string;
  inviteOnly: boolean;
};

type ClassroomFormProps = {
  idPrefix: string;
};

function ClassroomForm({ idPrefix }: ClassroomFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClassroomFormValues>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      proficiencyLevel: "Elementary",
      language: "English",
      coverId: coverOptions[0].id,
      inviteOnly: true,
    },
  });

  const selectedCover = watch("coverId");
  const isInviteOnly = watch("inviteOnly");

  const submitClassroom: SubmitHandler<ClassroomFormValues> = async (values) => {
    // Replace this with the Supabase insert when classroom persistence is connected.
    console.info("Create classroom", values);
  };

  return (
    <form onSubmit={handleSubmit(submitClassroom)} className="space-y-5" noValidate>
      <ClassroomFormField label="Classroom name" htmlFor={`${idPrefix}-classroom-name`} hint="Use a name learners will recognise." error={errors.name?.message}>
        <input id={`${idPrefix}-classroom-name`} placeholder="e.g. English for Everyday Life" className={inputClassName} {...register("name", { required: "Enter a classroom name.", maxLength: { value: 80, message: "Keep the classroom name under 80 characters." } })} />
      </ClassroomFormField>

      <ClassroomFormField label="Description" htmlFor={`${idPrefix}-classroom-description`} hint="A short summary shown on the classroom card." error={errors.description?.message}>
        <textarea id={`${idPrefix}-classroom-description`} rows={3} placeholder="What will learners practise in this classroom?" className={`${inputClassName} resize-none`} {...register("description", { required: "Add a short classroom description.", minLength: { value: 10, message: "Use at least 10 characters so learners have enough context." }, maxLength: { value: 240, message: "Keep the description under 240 characters." } })} />
      </ClassroomFormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClassroomFormField label="Proficiency level" htmlFor={`${idPrefix}-classroom-level`} error={errors.proficiencyLevel?.message}>
          <select id={`${idPrefix}-classroom-level`} className={inputClassName} {...register("proficiencyLevel", { required: "Choose a proficiency level." })}>
            <option>Beginner</option>
            <option>Elementary</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>Mixed levels</option>
          </select>
        </ClassroomFormField>

        <ClassroomFormField label="Language" htmlFor={`${idPrefix}-classroom-language`} error={errors.language?.message}>
          <select id={`${idPrefix}-classroom-language`} className={inputClassName} {...register("language", { required: "Choose a language." })}>
            <option>English</option>
            <option>Afrikaans</option>
            <option>isiZulu</option>
            <option>isiXhosa</option>
            <option>Sesotho</option>
            <option>French</option>
            <option>Spanish</option>
            <option>Multiple languages</option>
            <option>Other language</option>
          </select>
        </ClassroomFormField>
      </div>

      <ClassroomFormField label="Classroom cover" hint="Choose an image that gives learners a quick sense of the class." error={errors.coverId?.message}>
        <input type="hidden" {...register("coverId", { required: "Choose a classroom cover." })} />
        <div className="grid grid-cols-3 gap-2">
          {coverOptions.map((cover) => (
            <button
              key={cover.id}
              type="button"
              aria-label={`Use ${cover.alt} as the classroom cover`}
              aria-pressed={selectedCover === cover.id}
              onClick={() => setValue("coverId", cover.id, { shouldValidate: true })}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${
                selectedCover === cover.id ? "border-violet-700" : "border-transparent hover:border-slate-300"
              }`}
            >
              <img src={cover.image} alt={cover.alt} className="h-full w-full object-cover" />
              {selectedCover === cover.id && <span className="absolute inset-x-0 bottom-0 h-1 bg-violet-700" />}
            </button>
          ))}
        </div>
      </ClassroomFormField>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Invite-only classroom</p>
          <p className="mt-1 text-xs text-slate-500">Learners join with the code you share with them.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isInviteOnly}
          onClick={() => setValue("inviteOnly", !isInviteOnly)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${isInviteOnly ? "bg-violet-700" : "bg-slate-300"}`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${isInviteOnly ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Link to="/TeacherClassroom" className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</Link>
        <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          <Plus size={17} />
          {isSubmitting ? "Creating..." : "Create classroom"}
        </button>
      </div>
    </form>
  );
  }

  export default function CreateClassroom() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link>
          <button aria-label="Notifications" className="relative rounded-full p-2 transition hover:bg-slate-100"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" /></button>
        </header>

        <main className="flex-1 px-4 pb-5 sm:px-6">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-8 h-10 w-24 rounded-t-full bg-white/10" />
            <div className="relative pr-20"><p className="text-xs font-medium text-white">Teacher Portal</p><h1 className="mt-2 text-xl font-bold">Create a classroom</h1><p className="mt-1 text-xs text-white">Set up a focused space for your learners.</p></div>
            <div className="absolute inset-y-0 right-0 w-20 overflow-hidden bg-white"><img src="/classRoomIllustration.png" alt="Classroom illustration" className="block h-full w-full object-cover" /></div>
          </section>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-4"><ClassroomForm idPrefix="mobile" /></section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" active />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white"><Plus size={23} /></Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" />
        </nav>
      </div>

      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" active />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" to="/learning-hub" />
            <SidebarItem icon={<BookOpen size={18} />} label="Lessons" to="/lessons" />
            <SidebarItem icon={<Layers size={18} />} label="Flashcards" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Quizzes" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" /><SidebarItem icon={<LogOut size={18} />} label="Logout" /></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3"><Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link><div><p className="text-xs font-medium text-violet-700">Teacher Portal</p><h1 className="mt-1 text-xl font-bold">Create a classroom</h1></div></div>
            <div className="flex items-center gap-4"><button aria-label="Notifications" className="rounded-xl p-2.5 transition hover:bg-slate-100"><Bell size={19} /></button><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">T</div><div><p className="text-sm font-semibold">Teacher Siya</p><p className="text-xs text-slate-400">Teacher</p></div></div></div>
          </header>

          <div className="mx-auto w-full max-w-5xl p-5">
            <section className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="mb-5"><h2 className="text-lg font-bold">Classroom details</h2><p className="mt-1 text-sm text-slate-500">Give your learners clear context before they join.</p></div>
              <ClassroomForm idPrefix="desktop" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}