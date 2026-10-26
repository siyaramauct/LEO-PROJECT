// -----------------------------------------------------------------------------
// Journey: a teacher uploads documents
//
// Signed in as the saved teacher, the two places a teacher uploads files:
//   classroom materials   shared with the whole class from the classroom page
//                         (the "Class materials" panel on phones, the
//                         Classroom material tab on desktop)
//   lesson PDFs           attached while creating a lesson
//
// Files are picked through the browser's real file chooser: the test clicks
// "Upload file" or "Add PDFs" and hands the chooser a small file made in memory.
// -----------------------------------------------------------------------------

import { expect, test, type Locator, type Page } from "@playwright/test";
import { admin, seedClassroom, signedInUsers, TEACHER_STATE, uniqueName, visible } from "./helpers";

test.use({ storageState: TEACHER_STATE });

// -- Shared steps ---------------------------------------------------------------------

type PickedFile = { name: string; mimeType: string; buffer: Buffer };

// A small file to pick: a PDF by default.
function fileNamed(name: string, mimeType = "application/pdf"): PickedFile {
  return { name, mimeType, buffer: Buffer.from("%PDF-1.4 end-to-end test file") };
}

// Clicks a button that opens the file chooser, as a person would, and picks the
// file in it.
async function pickFile(page: Page, opener: Locator, file: PickedFile) {
  const chooserOpened = page.waitForEvent("filechooser");
  await opener.click();
  const chooser = await chooserOpened;
  await chooser.setFiles(file);
}

// The classroom page, showing its materials. Desktop keeps them in the
// Classroom material tab (?tab=materials); phones always show the panel and
// ignore the tab.
async function openClassroomMaterials(page: Page, classroomId: string) {
  await page.goto(`/teacher-classroom/${classroomId}?tab=materials`);
  await expect(visible(page.getByText("Upload file", { exact: true }))).toBeVisible();
}

// The classroom's materials, read as admin.
async function savedMaterials(classroomId: string) {
  const { data } = await admin
    .from("learning_resources")
    .select("resource_type, resource_url, lesson_id")
    .eq("classroom_id", classroomId);

  return data ?? [];
}

// The names of the files stored in a storage folder, read as admin.
async function storedFiles(folder: string) {
  const { data } = await admin.storage.from("documents").list(folder);

  return (data ?? []).map((file) => file.name);
}

// -- Classroom materials --------------------------------------------------------------

test("Test A - A teacher uploads a PDF to the classroom, and it appears in its materials", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));

  // 1. Open the materials and upload a PDF through the file chooser.
  await openClassroomMaterials(page, classroomId);
  await pickFile(
    page,
    visible(page.getByText("Upload file", { exact: true })),
    fileNamed("meeting-notes.pdf"),
  );

  // 2. It appears in the list under its own name.
  await expect(visible(page.getByText("meeting-notes.pdf"))).toBeVisible();

  // 3. It was saved as a classroom document, and the file is in storage.
  const materials = await savedMaterials(classroomId);

  expect(materials).toHaveLength(1);
  expect(materials[0]).toMatchObject({ resource_type: "document", lesson_id: null });
  expect(materials[0].resource_url).toMatch(/^classroom_documents\/.+-meeting-notes\.pdf$/);

  const stored = await storedFiles(`classroom_documents/${classroomId}`);
  expect(stored.some((name) => name.endsWith("-meeting-notes.pdf"))).toBe(true);
});

test("Test B - An unsupported file is refused with an explanation, and nothing is saved", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));

  // 1. Try to upload a program file.
  await openClassroomMaterials(page, classroomId);
  await pickFile(
    page,
    visible(page.getByText("Upload file", { exact: true })),
    fileNamed("setup.exe", "application/x-msdownload"),
  );

  // 2. The teacher is told why, and which files are allowed.
  await expect(visible(page.getByRole("alert"))).toContainText(
    "\"setup.exe\" can't be uploaded because .exe files aren't supported.",
  );

  // 3. Nothing was saved or stored.
  expect(await savedMaterials(classroomId)).toEqual([]);
  expect(await storedFiles(`classroom_documents/${classroomId}`)).toEqual([]);
});

// -- Lesson PDFs ----------------------------------------------------------------------

test("Test C - A teacher attaches a PDF while creating a lesson", async ({ page }) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));
  const title = uniqueName("Meetings and Money");

  // 1. Lesson details, with a PDF attached through "Add PDFs".
  await page.goto(`/create-lesson?classroomId=${classroomId}`);
  await page.getByLabel("Lesson title").fill(title);
  await page.getByLabel("Description").fill("Words for invoices, deadlines and profit.");
  await pickFile(page, page.getByText("Add PDFs", { exact: true }), fileNamed("glossary.pdf"));

  // 2. The PDF is listed before saving, with a way to remove it.
  await expect(page.getByText("glossary.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove glossary.pdf" })).toBeVisible();

  // 3. One flashcard (typed in the word list box), no quiz, then save.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Words and definitions").fill("invoice - A bill sent to a customer");
  await page.getByRole("button", { name: "Add 1 flashcard" }).click();
  await expect(page.getByLabel("Term", { exact: true })).toHaveValue("invoice");
  await page.getByRole("button", { name: "Choose activity" }).click();
  await page.getByRole("switch", { name: "Include an MCQ activity" }).click();
  await page.getByRole("button", { name: "Create lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher-classroom/${classroomId}$`));

  // 4. The PDF was saved as a document of that lesson, and stored in its folder.
  const { data: lesson } = await admin
    .from("lessons")
    .select("lesson_id")
    .eq("classroom_id", classroomId)
    .eq("title", title)
    .single();

  const lessonDocuments = (await savedMaterials(classroomId)).filter(
    (material) => material.lesson_id === lesson?.lesson_id,
  );

  expect(lessonDocuments).toHaveLength(1);
  expect(lessonDocuments[0].resource_type).toBe("document");

  const stored = await storedFiles(`lesson_documents/${classroomId}/${lesson?.lesson_id}`);
  expect(stored.some((name) => name.endsWith("-glossary.pdf"))).toBe(true);
});
