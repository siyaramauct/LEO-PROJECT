// -----------------------------------------------------------------------------
// Journeys: a teacher creates and edits a classroom
//
// Signed in as the saved teacher:
//   creating   open the classroom list, fill in the Create Classroom form, and
//              check the new classroom appears in the list and was saved with
//              what was entered
//   editing    press the pen on a classroom card, change the name and
//              description in the popup, and check the card and the saved row
//
// The pages render a phone layout and a desktop layout, so visible() picks the
// one on screen.
// -----------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { admin, seedClassroom, signedInUsers, TEACHER_STATE, uniqueName, visible } from "./helpers";

test.use({ storageState: TEACHER_STATE });

test("Test A - A teacher creates a classroom, and it appears in their list", async ({ page }) => {
  const { teacher } = signedInUsers();
  const name = uniqueName("Business English");

  // 1. From the classroom list, open the Create Classroom form. Once the list
  //    has loaded, a teacher with no classrooms also sees a second "Create
  //    Classroom" link in the empty list; both open the same form, so take the
  //    first rather than depend on whether the list has finished loading.
  await page.goto("/TeacherClassroom");
  await visible(page.getByRole("link", { name: "Create Classroom" }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/create-classroom$/);

  // 2. Fill it in and send it.
  await visible(page.getByLabel("Classroom name")).fill(name);
  await visible(page.getByLabel("Description")).fill("Meetings, emails and presentations.");
  await visible(page.getByLabel("Proficiency level")).selectOption("Intermediate");
  await visible(
    page.getByRole("button", { name: "Use Learner using a laptop as the classroom cover" }),
  ).click();
  await visible(page.getByRole("button", { name: "Create classroom" })).click();

  // 3. The app returns to the list, which now shows the new classroom.
  await expect(page).toHaveURL(/\/TeacherClassroom$/);
  await expect(visible(page.getByRole("heading", { name }))).toBeVisible();

  // 4. It was saved for this teacher, with the chosen level and cover.
  const { data: saved } = await admin
    .from("classrooms")
    .select("teacher_id, description, proficiency_level, cover_image_path")
    .eq("classroom_name", name)
    .single();

  expect(saved).toEqual({
    teacher_id: teacher.id,
    description: "Meetings, emails and presentations.",
    proficiency_level: "Intermediate",
    cover_image_path: "classroomImgs/Nerd-amico.png",
  });
});

// -- Editing a classroom --------------------------------------------------------------

// The classroom's name and description, read as admin.
async function savedDetails(classroomId: string) {
  const { data } = await admin
    .from("classrooms")
    .select("classroom_name, description")
    .eq("classroom_id", classroomId)
    .single();

  return data;
}

test("Test B - A teacher edits a classroom's name and description from its card", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const name = uniqueName("Business English");
  const newName = uniqueName("Advanced Business English");
  const classroomId = await seedClassroom(teacher, name);

  // 1. Press the pen on the classroom's card. The popup opens over the list
  //    with the classroom's cover and its current name filled in.
  await page.goto("/TeacherClassroom");
  await visible(page.getByRole("button", { name: `Edit ${name}` })).click();

  const dialog = page.getByRole("dialog", { name: "Edit classroom" });
  await expect(dialog.getByRole("img", { name: `${name} classroom cover` })).toBeVisible();
  await expect(dialog.getByLabel("Classroom name")).toHaveValue(name);

  // 2. Nothing has changed yet, so there is nothing to save.
  const save = dialog.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();

  // 3. Change both fields and save.
  await dialog.getByLabel("Classroom name").fill(newName);
  await dialog.getByLabel("Description").fill("Negotiation, reports and formal emails.");
  await save.click();

  // 4. The popup closes and the card shows the new name, still on the list.
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/TeacherClassroom$/);
  await expect(visible(page.getByRole("heading", { name: newName }))).toBeVisible();
  await expect(visible(page.getByRole("heading", { name }))).toHaveCount(0);

  // 5. It was saved.
  expect(await savedDetails(classroomId)).toEqual({
    classroom_name: newName,
    description: "Negotiation, reports and formal emails.",
  });
});

test("Test C - A refused edit shows why, and closing the popup keeps the classroom as it was", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const name = uniqueName("Business English");
  const classroomId = await seedClassroom(teacher, name);
  const before = await savedDetails(classroomId);

  await page.goto("/TeacherClassroom");
  await visible(page.getByRole("button", { name: `Edit ${name}` })).click();
  const dialog = page.getByRole("dialog", { name: "Edit classroom" });

  // 1. Spaces alone don't count as a name, so saving is refused with a reason.
  await dialog.getByLabel("Classroom name").fill("   ");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByText("Enter a classroom name.")).toBeVisible();

  // 2. Escape closes the popup without saving, and the card is unchanged.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(visible(page.getByRole("heading", { name }))).toBeVisible();
  expect(await savedDetails(classroomId)).toEqual(before);
});
