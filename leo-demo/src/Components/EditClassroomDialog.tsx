// -----------------------------------------------------------------------------
// Edit Classroom Dialog
//
// Popup for changing a classroom's name and description, opened from the pen
// on a classroom card. The classroom's cover sits across the top so the
// teacher can see which classroom they are editing; the cover, level and
// invite code can't be changed here.
//
// Built with react-hook-form, using the same rules as the create form
// (domain/classroomValidation). Save stays off until something has changed.
// On save it calls editClassroom and hands the saved (trimmed) text back to
// the page, which updates its list without reloading.
//
// Closes with the X button, Cancel, or the Escape key, but not while saving.
//
// Used by: TeacherClassroom
// -----------------------------------------------------------------------------

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../data/errors";
import {
  classroomDescriptionError,
  classroomNameError,
  MAX_CLASSROOM_DESCRIPTION_LENGTH,
} from "../domain/classroomValidation";
import { editClassroom, type ClassroomDetails } from "../services/teacherClassroomService";
import type { Classroom } from "./ClassroomMobileCard";
import ClassroomFormField from "./ClassroomFormField";

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-600";

type EditClassroomValues = {
  name: string;
  description: string;
};

type EditClassroomDialogProps = {
  classroom: Classroom;
  onClose: () => void;
  onSaved: (classroomId: string, details: ClassroomDetails) => void;
};

export default function EditClassroomDialog({
  classroom,
  onClose,
  onSaved,
}: EditClassroomDialogProps) {
  const { session } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditClassroomValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: classroom.name, description: classroom.savedDescription },
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const descriptionLength = useWatch({ control, name: "description" }).trim().length;

  const saveClassroom: SubmitHandler<EditClassroomValues> = async (values) => {
    if (!session?.user) {
      setSaveError("Your session has expired. Please sign in again.");
      return;
    }

    setSaveError(null);

    try {
      const saved = await editClassroom({
        teacherId: session.user.id,
        classroomId: classroom.id,
        name: values.name,
        description: values.description,
      });

      onSaved(classroom.id, saved);
    } catch (saveError) {
      console.error("Failed to update classroom:", saveError);
      setSaveError(
        errorMessage(saveError, "The classroom could not be updated. Please try again."),
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-classroom-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) onClose();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {
          // Cover banner: the classroom's own image, with its current name on top
        }
        <div className="relative h-28 shrink-0 bg-slate-100 sm:h-40">
          <img
            src={classroom.image}
            alt={classroom.imageAlt}
            className={`h-full w-full ${classroom.imageClassName}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit classroom"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm transition hover:bg-white disabled:opacity-50"
          >
            <X size={18} />
          </button>

          <div className="absolute inset-x-4 bottom-3 flex items-center gap-2 sm:inset-x-6 sm:bottom-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white shadow-sm">
              <Pencil size={15} />
            </span>
            <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base">
              {classroom.name}
            </p>
          </div>
        </div>

        {
          // Form: scrolls on its own when the screen is short
        }
        <form
          onSubmit={handleSubmit(saveClassroom)}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <h2 id="edit-classroom-title" className="text-lg font-bold text-slate-900">
                Edit classroom
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the name and description your learners see.
              </p>
            </div>

            <ClassroomFormField
              label="Classroom name"
              htmlFor="edit-classroom-name"
              hint="Use a name learners will recognise."
              error={errors.name?.message}
            >
              <input
                id="edit-classroom-name"
                placeholder="e.g. English for Everyday Life"
                autoFocus
                aria-invalid={Boolean(errors.name)}
                className={inputClassName}
                {...register("name", { validate: (value) => classroomNameError(value) ?? true })}
              />
            </ClassroomFormField>

            <ClassroomFormField
              label="Description"
              htmlFor="edit-classroom-description"
              hint="A short summary shown on the classroom card."
              error={errors.description?.message}
            >
              <textarea
                id="edit-classroom-description"
                rows={4}
                placeholder="What will learners practise in this classroom?"
                aria-invalid={Boolean(errors.description)}
                className={`${inputClassName} resize-none`}
                {...register("description", {
                  validate: (value) => classroomDescriptionError(value) ?? true,
                })}
              />
              <p
                className={`mt-1 text-right text-[11px] ${descriptionLength > MAX_CLASSROOM_DESCRIPTION_LENGTH ? "font-medium text-red-600" : "text-slate-400"}`}
              >
                {descriptionLength}/{MAX_CLASSROOM_DESCRIPTION_LENGTH}
              </p>
            </ClassroomFormField>

            {saveError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Check size={17} />
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
