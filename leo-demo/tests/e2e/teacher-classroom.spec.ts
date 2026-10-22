// -----------------------------------------------------------------------------
// Journey: a teacher creates a classroom
//
// Signed in as the saved teacher: open the classroom list, fill in the Create
// Classroom form, and check the new classroom appears in the list and was
// saved with what was entered. The create page renders a phone form and a
// desktop form, so visible() picks the one on screen.
// -----------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { admin, signedInUsers, TEACHER_STATE, uniqueName, visible } from "./helpers";

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
