// -----------------------------------------------------------------------------
// Teacher Classroom Tests
//
// What a teacher does to run a classroom, tested through the app's real
// services (src/services/teacherClassroomService.ts) while signed in, so RLS
// applies exactly as in the browser. Setup that isn't being tested uses the
// seed helpers (see helpers.ts).
//
// Sections still marked test.todo are planned and will be filled in later.
// -----------------------------------------------------------------------------

import { beforeAll, describe, expect, test } from "vitest";
import { deleteClassroom, getInviteCode, getTeacherClassrooms } from "../../src/data/classrooms";
import { getClassroomMaterials } from "../../src/data/materials";
import { getStudentClassroom } from "../../src/services/classroomService";
import {
  createClassroom,
  removeMaterial,
  removeStudent,
  shareDocument,
  shareLink,
} from "../../src/services/teacherClassroomService";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedLesson,
  seedMaterial,
  seedUser,
  signInAs,
  signOut,
  testFile,
  type TestUser,
} from "./helpers";

// The message Postgres gives when an RLS policy refuses a new row. Checking for
// it makes sure a refusal test fails if something else goes wrong instead.
const RLS_REFUSAL = "violates row-level security policy";

// The details a teacher fills in on the Create Classroom page.
function classroomInput(teacher: TestUser, name: string) {
  return {
    teacherId: teacher.id,
    name,
    description: "  Vocabulary for meetings, emails and presentations.  ",
    proficiencyLevel: "Intermediate",
    coverImagePath: "classroomImgs/business.png",
  };
}

// createClassroom returns nothing, so find the new classroom the way the app
// does: in the teacher's own list (read as the signed-in teacher).
async function findTeacherClassroom(teacher: TestUser, name: string) {
  const classrooms = await getTeacherClassrooms(teacher.id);

  return classrooms.find((classroom) => classroom.classroom_name === name);
}

// -- Checks read as admin, so RLS can't hide what really happened -------------------

async function isEnrolled(student: TestUser, classroomId: string) {
  const { data } = await admin
    .from("classroom_students")
    .select("student_id")
    .eq("student_id", student.id)
    .eq("classroom_id", classroomId);

  return (data ?? []).length > 0;
}

async function notificationsFor(user: TestUser, type: string) {
  const { data } = await admin
    .from("notifications")
    .select("title, body, link_url")
    .eq("recipient_id", user.id)
    .eq("type", type);

  return data ?? [];
}

// The names of the files stored in a classroom's materials folder.
async function storedClassroomFiles(classroomId: string) {
  const { data } = await admin.storage.from("documents").list(`classroom_documents/${classroomId}`);

  return (data ?? []).map((file) => file.name);
}

// -- Creating a classroom -------------------------------------------------------------

describe("Creating a classroom", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");
  });

  test("Test A - A teacher's new classroom appears in their list, with its text trimmed", async () => {
    await signInAs(teacher);

    await createClassroom(classroomInput(teacher, "  Business English  "));
    const classroom = await findTeacherClassroom(teacher, "Business English");

    expect(classroom).toBeDefined();
    expect(classroom?.description).toBe("Vocabulary for meetings, emails and presentations.");
    expect(classroom?.cover_image_path).toBe("classroomImgs/business.png");
  });

  test("Test B - The classroom is saved with the app's fixed settings and a join code", async () => {
    await signInAs(teacher);

    await createClassroom(classroomInput(teacher, "Marketing B2"));
    const classroom = await findTeacherClassroom(teacher, "Marketing B2");

    // Read the columns the teacher's list doesn't show, as admin.
    const { data: row } = await admin
      .from("classrooms")
      .select("teacher_id, language, invite_only, proficiency_level, join_code")
      .eq("classroom_id", classroom?.classroom_id)
      .single();

    expect(row?.teacher_id).toBe(teacher.id);
    expect(row?.language).toBe("English");
    expect(row?.invite_only).toBe(true);
    expect(row?.proficiency_level).toBe("Intermediate");
    // Four letters from the name, a dash, four random characters: "MARK-7K2Q".
    expect(row?.join_code).toMatch(/^MARK-[A-Z0-9]{4}$/);
  });

  test("Test C - Every new classroom gets a private invite code the teacher can read", async () => {
    await signInAs(teacher);

    await createClassroom(classroomInput(teacher, "Finance Basics"));
    const classroom = await findTeacherClassroom(teacher, "Finance Basics");
    const inviteCode = await getInviteCode(classroom?.classroom_id as string);

    expect(inviteCode).toBeTruthy();
  });

  test("Test D - A student can't create a classroom", async () => {
    await signInAs(student);
    await expect(createClassroom(classroomInput(student, "Student Club"))).rejects.toThrow(
      RLS_REFUSAL,
    );
  });

  test("Test E - A teacher can't create a classroom for another teacher", async () => {
    await signInAs(teacher);
    await expect(createClassroom(classroomInput(otherTeacher, "Not My Classroom"))).rejects.toThrow(
      RLS_REFUSAL,
    );
  });

  test("Test F - A visitor who isn't signed in can't create a classroom", async () => {
    await signOut();
    await expect(createClassroom(classroomInput(teacher, "Anonymous Class"))).rejects.toThrow(
      RLS_REFUSAL,
    );
  });
});

// -- Deleting a classroom -------------------------------------------------------------

// How many rows of a table still belong to the classroom (read as admin).
async function rowsInClassroom(table: string, classroomId: string) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("classroom_id", classroomId);

  return count ?? 0;
}

describe("Deleting a classroom", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");
  });

  test("Test A - A teacher deletes their classroom, and it leaves their list", async () => {
    const classroomId = await seedClassroom(teacher, "Old Classroom");

    await signInAs(teacher);
    await deleteClassroom(teacher.id, classroomId);

    const classrooms = await getTeacherClassrooms(teacher.id);

    expect(classrooms.map((row) => row.classroom_id)).not.toContain(classroomId);
    expect(await rowsInClassroom("classrooms", classroomId)).toBe(0);
  });

  test("Test B - Its lessons, enrolments and materials are deleted with it", async () => {
    const classroomId = await seedClassroom(teacher);
    await seedLesson(classroomId);
    await seedEnrolment(student, classroomId);
    await seedMaterial(classroomId, { type: "link" });

    await signInAs(teacher);
    await deleteClassroom(teacher.id, classroomId);

    // ON DELETE CASCADE removes everything that belongs to the classroom.
    expect(await rowsInClassroom("lessons", classroomId)).toBe(0);
    expect(await rowsInClassroom("classroom_students", classroomId)).toBe(0);
    expect(await rowsInClassroom("learning_resources", classroomId)).toBe(0);
  });

  test("Test C - Its students can no longer open it, and aren't told they were removed", async () => {
    const classroomId = await seedClassroom(teacher);
    const classmate = await seedUser("student");
    await seedEnrolment(classmate, classroomId);

    await signInAs(teacher);
    await deleteClassroom(teacher.id, classroomId);

    await signInAs(classmate);
    await expect(getStudentClassroom(classmate.id, classroomId)).rejects.toThrow(
      "This classroom is unavailable.",
    );

    // The enrolment trigger skips its notice when the whole classroom goes.
    expect(await notificationsFor(classmate, "removed_from_classroom")).toEqual([]);
  });

  test("Test D - Another teacher can't delete this classroom", async () => {
    const classroomId = await seedClassroom(teacher);

    await signInAs(otherTeacher);
    // RLS doesn't raise an error for a refused delete; it deletes nothing.
    await deleteClassroom(otherTeacher.id, classroomId);
    await deleteClassroom(teacher.id, classroomId); // Even naming the real owner.

    expect(await rowsInClassroom("classrooms", classroomId)).toBe(1);
  });

  test("Test E - A student can't delete a classroom", async () => {
    const classroomId = await seedClassroom(teacher);
    await seedEnrolment(student, classroomId);

    await signInAs(student);
    await deleteClassroom(teacher.id, classroomId);

    expect(await rowsInClassroom("classrooms", classroomId)).toBe(1);
  });

  // KNOWN GAP: deleting a classroom removes its rows but not its files, so the
  // uploaded documents stay in the documents bucket with nothing pointing at
  // them. Marked `fails` until cleanup is added; then delete `.fails`.
  test.fails("Test F - The classroom's uploaded files are removed from storage", async () => {
    const classroomId = await seedClassroom(teacher);
    await seedMaterial(classroomId, { fileName: "handout.pdf" });

    await signInAs(teacher);
    await deleteClassroom(teacher.id, classroomId);

    expect(await storedClassroomFiles(classroomId)).toEqual([]);
  });
});

// -- Removing a student ---------------------------------------------------------------

describe("Removing a student", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
  });

  test("Test A - A teacher removes a student, and the student is told", async () => {
    const student = await seedUser("student");
    const classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);

    await signInAs(teacher);
    await removeStudent({ classroomId, classroomName: "Business English", studentId: student.id });

    expect(await isEnrolled(student, classroomId)).toBe(false);
    expect(await notificationsFor(student, "removed_from_classroom")).toEqual([
      {
        title: "You were removed from a classroom",
        body: 'You were removed from "Business English".',
        link_url: "/student/classrooms",
      },
    ]);
  });

  test("Test B - A removed student can no longer open the classroom", async () => {
    const student = await seedUser("student");
    const classroomId = await seedClassroom(teacher);
    await seedEnrolment(student, classroomId);

    await signInAs(teacher);
    await removeStudent({ classroomId, classroomName: "Business English", studentId: student.id });

    await signInAs(student);
    await expect(getStudentClassroom(student.id, classroomId)).rejects.toThrow(
      "This classroom is unavailable.",
    );
  });

  test("Test C - Another teacher can't remove a student from this classroom", async () => {
    const student = await seedUser("student");
    const classroomId = await seedClassroom(teacher);
    await seedEnrolment(student, classroomId);

    await signInAs(otherTeacher);
    // RLS doesn't raise an error for a refused delete; it deletes nothing.
    // So check the enrolment itself rather than whether the call succeeded.
    await removeStudent({ classroomId, classroomName: "Business English", studentId: student.id });

    expect(await isEnrolled(student, classroomId)).toBe(true);
  });

  // The database sends "removed_from_classroom" itself, from a trigger that
  // runs only when an enrolment is really deleted (notify_enrolment_removed).
  // Copies sent by the app are dropped (skip_app_copy_notifications), so a
  // refused removal can't send a false notice. This guards that.
  test("Test D - A student isn't told they were removed when they weren't", async () => {
    const student = await seedUser("student");
    const classroomId = await seedClassroom(teacher);
    await seedEnrolment(student, classroomId);

    await signInAs(otherTeacher);
    await removeStudent({ classroomId, classroomName: "Business English", studentId: student.id });

    expect(await notificationsFor(student, "removed_from_classroom")).toEqual([]);
  });
});

// -- Sharing documents ----------------------------------------------------------------

describe("Sharing documents", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");
    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A teacher shares a document, and it appears in the classroom materials", async () => {
    await signInAs(teacher);

    const material = await shareDocument({
      classroomId,
      classroomName: "Business English",
      file: testFile("meeting-notes.pdf", "application/pdf"),
      contentType: "application/pdf",
    });

    // The returned material points at the file in this classroom's folder.
    expect(material.resource_type).toBe("document");
    expect(material.resource_url).toMatch(
      new RegExp(`^classroom_documents/${classroomId}/[0-9a-f-]{36}-meeting-notes\\.pdf$`),
    );

    // The file is in storage, and the material is in the classroom's list.
    const storedName = material.resource_url.split("/").pop();
    const materials = await getClassroomMaterials(classroomId);

    expect(await storedClassroomFiles(classroomId)).toContain(storedName);
    expect(materials.map((row) => row.resource_id)).toContain(material.resource_id);
  });

  test("Test B - Enrolled students are told about the new document", async () => {
    await signInAs(teacher);

    await shareDocument({
      classroomId,
      classroomName: "Business English",
      file: testFile("agenda.pdf", "application/pdf"),
      contentType: "application/pdf",
    });

    const notifications = await notificationsFor(student, "new_material");

    expect(notifications).toContainEqual({
      title: "New classroom material",
      body: 'Your teacher shared "agenda.pdf" in "Business English".',
      link_url: `/student/classrooms/${classroomId}`,
    });
  });

  test("Test C - Unsafe characters in the file name are replaced in the storage path", async () => {
    await signInAs(teacher);

    const material = await shareDocument({
      classroomId,
      classroomName: "Business English",
      file: testFile("Q3 report (final).pdf", "application/pdf"),
      contentType: "application/pdf",
    });

    expect(material.resource_url).toMatch(/-Q3-report--final-\.pdf$/);
  });

  test("Test D - Another teacher can't share a document into this classroom", async () => {
    await signInAs(otherTeacher);

    await expect(
      shareDocument({
        classroomId,
        classroomName: "Business English",
        file: testFile("spam.pdf", "application/pdf"),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow("The document was uploaded but could not be shared.");

    // No material row was created for it.
    const { data } = await admin
      .from("learning_resources")
      .select("resource_url")
      .eq("classroom_id", classroomId)
      .like("resource_url", "%spam.pdf");

    expect(data).toEqual([]);
  });

  test("Test E - A student can't share a document", async () => {
    await signInAs(student);

    await expect(
      shareDocument({
        classroomId,
        classroomName: "Business English",
        file: testFile("homework.pdf", "application/pdf"),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow();
  });

  // KNOWN GAPS: when recording the material fails, shareDocument leaves the
  // uploaded file in storage (lesson PDFs are cleaned up; classroom materials
  // aren't). The upload only succeeds at all because the "Doc upload policy
  // flreew_*" policies let anyone write to the documents bucket. Marked `fails`
  // until fixed; then delete `.fails`.
  test.fails("Test F - A refused share leaves no file behind in storage", async () => {
    await signInAs(otherTeacher);

    await shareDocument({
      classroomId,
      classroomName: "Business English",
      file: testFile("leftover.pdf", "application/pdf"),
      contentType: "application/pdf",
    }).catch(() => undefined);

    const files = await storedClassroomFiles(classroomId);

    expect(files.some((name) => name.endsWith("-leftover.pdf"))).toBe(false);
  });
});

// -- Removing materials ---------------------------------------------------------------

// True while the material's row still exists (read as admin).
async function materialExists(resourceId: string) {
  const { data } = await admin
    .from("learning_resources")
    .select("resource_id")
    .eq("resource_id", resourceId);

  return (data ?? []).length > 0;
}

// True while the document's file is still in its classroom's folder.
async function documentFileExists(classroomId: string, resourceUrl: string) {
  const fileName = resourceUrl.split("/").pop() as string;

  return (await storedClassroomFiles(classroomId)).includes(fileName);
}

describe("Removing materials", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A teacher removes a document, and its file is deleted from storage", async () => {
    // Each test seeds its own material, so one removal can't affect another test.
    const document = await seedMaterial(classroomId, { fileName: "old-agenda.pdf" });

    await signInAs(teacher);
    await removeMaterial({
      id: document.resource_id,
      resourceType: "document",
      resourcePath: document.resource_url,
    });

    expect(await materialExists(document.resource_id)).toBe(false);
    expect(await documentFileExists(classroomId, document.resource_url)).toBe(false);
  });

  test("Test B - A teacher removes a link", async () => {
    const link = await seedMaterial(classroomId, { type: "link" });

    await signInAs(teacher);
    await removeMaterial({
      id: link.resource_id,
      resourceType: "link",
      resourcePath: link.resource_url,
    });

    expect(await materialExists(link.resource_id)).toBe(false);
  });

  test("Test C - A removed material disappears from the classroom's list", async () => {
    const document = await seedMaterial(classroomId);

    await signInAs(teacher);
    await removeMaterial({
      id: document.resource_id,
      resourceType: "document",
      resourcePath: document.resource_url,
    });

    const materials = await getClassroomMaterials(classroomId);

    expect(materials.map((row) => row.resource_id)).not.toContain(document.resource_id);
  });

  test("Test D - Another teacher can't remove a material from this classroom", async () => {
    const link = await seedMaterial(classroomId, { type: "link" });

    await signInAs(otherTeacher);
    // RLS doesn't raise an error for a refused delete; it deletes nothing.
    await removeMaterial({
      id: link.resource_id,
      resourceType: "link",
      resourcePath: link.resource_url,
    });

    expect(await materialExists(link.resource_id)).toBe(true);
  });

  test("Test E - A student can't remove a material", async () => {
    const link = await seedMaterial(classroomId, { type: "link" });

    await signInAs(student);
    await removeMaterial({
      id: link.resource_id,
      resourceType: "link",
      resourcePath: link.resource_url,
    });

    expect(await materialExists(link.resource_id)).toBe(true);
  });

  // KNOWN GAP: removeMaterial deletes the file before the row. The "Doc upload
  // policy flreew_*" policies let anyone delete from the documents bucket, so a
  // refused removal still deletes the file while RLS keeps the row, leaving a
  // material whose link is broken. Marked `fails` until fixed; then delete `.fails`.
  test.fails("Test F - A refused removal leaves the document's file in place", async () => {
    const document = await seedMaterial(classroomId, { fileName: "keep-me.pdf" });

    await signInAs(otherTeacher);
    await removeMaterial({
      id: document.resource_id,
      resourceType: "document",
      resourcePath: document.resource_url,
    });

    expect(await materialExists(document.resource_id)).toBe(true);
    expect(await documentFileExists(classroomId, document.resource_url)).toBe(true);
  });
});

// -- Sharing links --------------------------------------------------------------------

describe("Sharing links", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A teacher shares a web link, and it appears in the classroom materials", async () => {
    await signInAs(teacher);

    const material = await shareLink({
      classroomId,
      classroomName: "Business English",
      url: "https://www.bbc.co.uk/learningenglish",
    });

    const materials = await getClassroomMaterials(classroomId);

    expect(material.resource_type).toBe("link");
    expect(material.resource_url).toBe("https://www.bbc.co.uk/learningenglish");
    expect(materials.map((row) => row.resource_id)).toContain(material.resource_id);
  });

  test("Test B - An address typed without https:// gets it added", async () => {
    await signInAs(teacher);

    const material = await shareLink({
      classroomId,
      classroomName: "Business English",
      url: "example.com/business-vocabulary",
    });

    expect(material.resource_url).toBe("https://example.com/business-vocabulary");
  });

  test("Test C - A javascript: or ftp:// address is refused, and nothing is saved", async () => {
    await signInAs(teacher);

    for (const url of ["javascript:alert(1)", "ftp://files.example.com/notes.pdf"]) {
      await expect(
        shareLink({ classroomId, classroomName: "Business English", url }),
      ).rejects.toThrow("Enter a web address that starts with http:// or https://.");
    }

    const { data } = await admin
      .from("learning_resources")
      .select("resource_url")
      .eq("classroom_id", classroomId)
      .or("resource_url.ilike.%javascript%,resource_url.ilike.ftp%");

    expect(data).toEqual([]);
  });

  test("Test D - Enrolled students are told about the new link", async () => {
    await signInAs(teacher);

    await shareLink({
      classroomId,
      classroomName: "Business English",
      url: "https://dictionary.cambridge.org",
    });

    expect(await notificationsFor(student, "new_material")).toContainEqual({
      title: "New classroom material",
      body: 'Your teacher shared a link in "Business English".',
      link_url: `/student/classrooms/${classroomId}`,
    });
  });

  test("Test E - Another teacher can't share a link into this classroom", async () => {
    await signInAs(otherTeacher);

    await expect(
      shareLink({ classroomId, classroomName: "Business English", url: "https://spam.example" }),
    ).rejects.toThrow("The material could not be shared with learners.");
  });

  test("Test F - A student can't share a link", async () => {
    await signInAs(student);

    await expect(
      shareLink({
        classroomId,
        classroomName: "Business English",
        url: "https://homework.example",
      }),
    ).rejects.toThrow("The material could not be shared with learners.");
  });
});
