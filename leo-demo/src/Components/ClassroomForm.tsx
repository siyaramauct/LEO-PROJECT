import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";
import ClassroomFormField from "./ClassroomFormField";

const coverOptions = [
  { id: "everyday", alt: "Learner studying from a book", path: "classroomImgs/fetchbook.jpg" },
  { id: "reading", alt: "Library illustration", path: "classroomImgs/libIl.jpg" },
  { id: "digital", alt: "Learner using a laptop", path: "classroomImgs/Nerd-amico.png" },
  { id: "desktop-windows", alt: "People working across desktop windows", path: "classroomImgs/desktopwindowspeople.avif" },
  { id: "dinosaur", alt: "Dinosaur classroom illustration", path: "classroomImgs/dinosaurpeople.png" },
  { id: "kid-letters", alt: "Kids drawing letters", path: "classroomImgs/kidletterdrawings.jpg" },
  { id: "guy-patch", alt: "Guy patched into a classroom", path: "classroomImgs/guypatchclassroom.avif" },
].map((cover) => ({
  ...cover,
  image: supabase.storage.from("images").getPublicUrl(cover.path).data.publicUrl,
}));

const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100";

const generateJoinCode = (classroomName: string) => {
  const namePrefix = classroomName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4).padEnd(4, "CLASS");
  const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(-4).padStart(4, "0");

  return `${namePrefix}-${randomSuffix}`;
};

type ClassroomFormValues = {
  name: string;
  description: string;
  proficiencyLevel: string;
  coverId: string;
};

type ClassroomFormProps = {
  idPrefix: string;
};

export default function ClassroomForm({ idPrefix }: ClassroomFormProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClassroomFormValues>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: { proficiencyLevel: "Elementary", coverId: coverOptions[0].id },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedCover = watch("coverId");

  const submitClassroom: SubmitHandler<ClassroomFormValues> = async (values) => {
    if (!session?.user) {
      setSubmitError("Your session has expired. Please sign in again.");
      return;
    }

    setSubmitError(null);
    const selectedCoverOption = coverOptions.find((cover) => cover.id === values.coverId);
    if (!selectedCoverOption) {
      setSubmitError("Choose a classroom cover.");
      return;
    }

    const { error } = await supabase.from("classrooms").insert({
      teacher_id: session.user.id,
      classroom_name: values.name.trim(),
      description: values.description.trim(),
      proficiency_level: values.proficiencyLevel,
      // The language picker was removed; every classroom is English. Kept because the column may be required.
      language: "English",
      cover_image_path: selectedCoverOption.path,
      invite_only: true,
      join_code: generateJoinCode(values.name),
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    navigate("/TeacherClassroom");
  };

  return (
    <form onSubmit={handleSubmit(submitClassroom)} className="space-y-5" noValidate>
      <ClassroomFormField label="Classroom name" htmlFor={`${idPrefix}-classroom-name`} hint="Use a name learners will recognise." error={errors.name?.message}><input id={`${idPrefix}-classroom-name`} placeholder="e.g. English for Everyday Life" className={inputClassName} {...register("name", { required: "Enter a classroom name.", maxLength: { value: 80, message: "Keep the classroom name under 80 characters." } })} /></ClassroomFormField>
      <ClassroomFormField label="Description" htmlFor={`${idPrefix}-classroom-description`} hint="A short summary shown on the classroom card." error={errors.description?.message}><textarea id={`${idPrefix}-classroom-description`} rows={3} placeholder="What will learners practise in this classroom?" className={`${inputClassName} resize-none`} {...register("description", { required: "Add a short classroom description.", minLength: { value: 10, message: "Use at least 10 characters so learners have enough context." }, maxLength: { value: 240, message: "Keep the description under 240 characters." } })} /></ClassroomFormField>
      <ClassroomFormField label="Proficiency level" htmlFor={`${idPrefix}-classroom-level`} error={errors.proficiencyLevel?.message}><select id={`${idPrefix}-classroom-level`} className={inputClassName} {...register("proficiencyLevel", { required: "Choose a proficiency level." })}><option>Beginner</option><option>Elementary</option><option>Intermediate</option><option>Advanced</option><option>Mixed levels</option></select></ClassroomFormField>
      <ClassroomFormField label="Classroom cover" hint="Choose an image that gives learners a quick sense of the class." error={errors.coverId?.message}>
        <input type="hidden" {...register("coverId", { required: "Choose a classroom cover." })} />
        <div className="grid grid-cols-3 gap-2">{coverOptions.map((cover) => <button key={cover.id} type="button" aria-label={`Use ${cover.alt} as the classroom cover`} aria-pressed={selectedCover === cover.id} onClick={() => setValue("coverId", cover.id, { shouldValidate: true })} className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${selectedCover === cover.id ? "border-violet-700" : "border-transparent hover:border-slate-300"}`}><img src={cover.image} alt={cover.alt} className="h-full w-full object-cover" />{selectedCover === cover.id && <span className="absolute inset-x-0 bottom-0 h-1 bg-violet-700" />}</button>)}</div>
      </ClassroomFormField>
      {submitError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><Link to="/TeacherClassroom" className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</Link><button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"><Plus size={17} />{isSubmitting ? "Creating..." : "Create classroom"}</button></div>
    </form>
  );
}
