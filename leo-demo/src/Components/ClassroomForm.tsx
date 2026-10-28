// -----------------------------------------------------------------------------
// Classroom Form
//
// The "create a classroom" form: name, description, proficiency level and a
// cover image. Built with react-hook-form, which handles the field values and
// validation messages; the name and description rules come from
// domain/classroomValidation, shared with EditClassroomDialog. On submit it
// inserts the classroom and returns the teacher to their classroom list. A
// database trigger then creates the private invite code students use to join.
//
// Used by: CreateClassroom
// -----------------------------------------------------------------------------

import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../data/errors";
import { classroomDescriptionError, classroomNameError } from "../domain/classroomValidation";
import { createClassroom } from "../services/teacherClassroomService";
import { bucketImageUrl } from "../utils/images";
import ClassroomFormField from "./ClassroomFormField";

// -- Options ------------------------------------------------------------------

// Cover images teachers can pick from, stored in the images bucket.
const coverOptions = [
  { id: "everyday", alt: "Learner studying from a book", path: "classroomImgs/fetchbook.jpg" },
  { id: "reading", alt: "Library illustration", path: "classroomImgs/libIl.jpg" },
  { id: "digital", alt: "Learner using a laptop", path: "classroomImgs/Nerd-amico.png" },
  {
    id: "desktop-windows",
    alt: "People working across desktop windows",
    path: "classroomImgs/desktopwindowspeople.avif",
  },
  {
    id: "dinosaur",
    alt: "Dinosaur classroom illustration",
    path: "classroomImgs/dinosaurpeople.png",
  },
  { id: "kid-letters", alt: "Kids drawing letters", path: "classroomImgs/kidletterdrawings.jpg" },
  {
    id: "guy-patch",
    alt: "Guy patched into a classroom",
    path: "classroomImgs/guypatchclassroom.avif",
  },
  {
    id: "english-book",
    alt: "Hands holding an English book with letters around it",
    path: "classroomImgs/englishHoldingBack.jpg",
  },
  {
    id: "beach",
    alt: "Seaside view from a balcony with a beach umbrella",
    path: "classroomImgs/whitetopaz-beach-illustration.jpg",
  },
  {
    id: "jungle-reading",
    alt: "Girl reading a book among jungle leaves",
    path: "classroomImgs/whitetopaz-girlreadingjungle.jpg",
  },
].map((cover) => ({ ...cover, image: bucketImageUrl(cover.path) }));

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-600";

// -- Form ---------------------------------------------------------------------

type ClassroomFormValues = {
  name: string;
  description: string;
  proficiencyLevel: string;
  coverId: string;
};

type ClassroomFormProps = {
  idPrefix: string; // Keeps input ids unique when the form is rendered twice (mobile and desktop).
};

export default function ClassroomForm({ idPrefix }: ClassroomFormProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClassroomFormValues>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: { proficiencyLevel: "Elementary", coverId: coverOptions[0].id },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedCover = useWatch({ control, name: "coverId" });

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

    try {
      await createClassroom({
        teacherId: session.user.id,
        name: values.name,
        description: values.description,
        proficiencyLevel: values.proficiencyLevel,
        coverImagePath: selectedCoverOption.path,
      });

      navigate("/TeacherClassroom");
    } catch (createError) {
      console.error("Failed to create classroom:", createError);
      setSubmitError(errorMessage(createError, "The classroom could not be created."));
    }
  };

  return (
    <form onSubmit={handleSubmit(submitClassroom)} className="space-y-5" noValidate>
      <ClassroomFormField
        label="Classroom name"
        htmlFor={`${idPrefix}-classroom-name`}
        hint="Use a name learners will recognise."
        error={errors.name?.message}
      >
        <input
          id={`${idPrefix}-classroom-name`}
          placeholder="e.g. English for Everyday Life"
          className={inputClassName}
          {...register("name", { validate: (value) => classroomNameError(value) ?? true })}
        />
      </ClassroomFormField>
      <ClassroomFormField
        label="Description"
        htmlFor={`${idPrefix}-classroom-description`}
        hint="A short summary shown on the classroom card."
        error={errors.description?.message}
      >
        <textarea
          id={`${idPrefix}-classroom-description`}
          rows={3}
          placeholder="What will learners practise in this classroom?"
          className={`${inputClassName} resize-none`}
          {...register("description", {
            validate: (value) => classroomDescriptionError(value) ?? true,
          })}
        />
      </ClassroomFormField>
      <ClassroomFormField
        label="Proficiency level"
        htmlFor={`${idPrefix}-classroom-level`}
        error={errors.proficiencyLevel?.message}
      >
        <select
          id={`${idPrefix}-classroom-level`}
          className={inputClassName}
          {...register("proficiencyLevel", { required: "Choose a proficiency level." })}
        >
          <option>Beginner</option>
          <option>Elementary</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Mixed levels</option>
        </select>
      </ClassroomFormField>
      <ClassroomFormField
        label="Classroom cover"
        hint="Choose an image that gives learners a quick sense of the class."
        error={errors.coverId?.message}
      >
        {
          // The cover buttons write to this hidden field so react-hook-form validates it.
        }
        <input type="hidden" {...register("coverId", { required: "Choose a classroom cover." })} />
        <div className="grid grid-cols-3 gap-2">
          {coverOptions.map((cover) => (
            <button
              key={cover.id}
              type="button"
              aria-label={`Use ${cover.alt} as the classroom cover`}
              aria-pressed={selectedCover === cover.id}
              onClick={() => setValue("coverId", cover.id, { shouldValidate: true })}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${selectedCover === cover.id ? "border-violet-700" : "border-transparent hover:border-slate-300"}`}
            >
              <img src={cover.image} alt={cover.alt} className="h-full w-full object-cover" />
              {selectedCover === cover.id && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-violet-700" />
              )}
            </button>
          ))}
        </div>
      </ClassroomFormField>
      {submitError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Link
          to="/TeacherClassroom"
          className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus size={17} />
          {isSubmitting ? "Creating..." : "Create classroom"}
        </button>
      </div>
    </form>
  );
}
