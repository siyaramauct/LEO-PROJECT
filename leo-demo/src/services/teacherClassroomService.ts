// -----------------------------------------------------------------------------
// Teacher Classroom Service
//
// What a teacher does to run a classroom, step by step: create it, share files
// and links with the class, remove a material, and remove a student. Pages call these instead of querying Supabase (see src/data).
//
// Functions throw a DataError whose message can be shown to the teacher.
// -----------------------------------------------------------------------------

import { insertClassroom } from "../data/classrooms";
import { removeEnrolment } from "../data/enrolments";
import { DataError } from "../data/errors";
import {
  addMaterial,
  deleteMaterial,
  removeDocumentFiles,
  uploadDocument,
  type Material,
} from "../data/materials";
import { notifyClassroomStudents, notifyUser } from "../data/notifications";

// -- Classrooms ---------------------------------------------------------------------

type NewClassroomInput = {
  teacherId: string;
  name: string;
  description: string;
  proficiencyLevel: string;
  coverImagePath: string;
};

export function createClassroom({
  teacherId,
  name,
  description,
  proficiencyLevel,
  coverImagePath,
}: NewClassroomInput): Promise<void> {
  return insertClassroom({
    teacherId,
    name: name.trim(),
    description: description.trim(),
    proficiencyLevel,
    coverImagePath,
    joinCode: generateJoinCode(name),
  });
}

// Fills the legacy classrooms.join_code column, which must still be unique, as
// four letters from the name and four random characters, e.g. "BUSI-7K2Q".
// Students join with the private invite code instead (see ClassroomInvitePanel).
function generateJoinCode(classroomName: string) {
  const namePrefix = classroomName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "CLASS");

  const randomSuffix = crypto
    .getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");

  return `${namePrefix}-${randomSuffix}`;
}

// -- Materials ---------------------------------------------------------------------

type ShareDocumentInput = {
  classroomId: string;
  classroomName: string;
  file: File;
  contentType: string; // From validateMaterialFile.
};

export async function shareDocument({
  classroomId,
  classroomName,
  file,
  contentType,
}: ShareDocumentInput): Promise<Material> {
  // 1. Store the file. Storage "folders" are just path prefixes; the random id
  //    stops a second upload with the same name overwriting a file in use.
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `classroom_documents/${classroomId}/${crypto.randomUUID()}-${safeFileName}`;

  await uploadDocument(storagePath, file, contentType);

  // 2. Record it as a classroom material.
  const material = await addMaterial({ classroomId, type: "document", url: storagePath }).catch(
    (insertError) => {
      throw new DataError(
        "The document was uploaded but could not be shared. Please try again.",
        insertError,
      );
    },
  );

  // 3. Tell the students (best effort).
  await notifyClassroomStudents(classroomId, {
    type: "new_material",
    title: "New classroom material",
    body: `Your teacher shared "${file.name}" in "${classroomName}".`,
    link_url: `/student/classrooms/${classroomId}`,
  });

  return material;
}

// Only http and https addresses are accepted; "example.com" is treated as
// "https://example.com".
export function normaliseLink(url: string) {
  const externalUrl = url.includes("://") ? url : `https://${url}`;

  try {
    const { protocol } = new URL(externalUrl);

    if (protocol === "http:" || protocol === "https:") {
      return externalUrl;
    }
  } catch {
    // Not a valid address; reported below.
  }

  throw new DataError("Enter a web address that starts with http:// or https://.");
}

type ShareLinkInput = {
  classroomId: string;
  classroomName: string;
  url: string;
};

export async function shareLink({
  classroomId,
  classroomName,
  url,
}: ShareLinkInput): Promise<Material> {
  // 1. Check the address and record it.
  const material = await addMaterial({ classroomId, type: "link", url: normaliseLink(url) });

  // 2. Tell the students (best effort).
  await notifyClassroomStudents(classroomId, {
    type: "new_material",
    title: "New classroom material",
    body: `Your teacher shared a link in "${classroomName}".`,
    link_url: `/student/classrooms/${classroomId}`,
  });

  return material;
}

type MaterialToRemove = {
  id: string;
  resourceType: "document" | "link";
  resourcePath: string;
};

// Removes the stored file first (if any), then the material row.
export async function removeMaterial({
  id,
  resourceType,
  resourcePath,
}: MaterialToRemove): Promise<void> {
  if (resourceType === "document") {
    await removeDocumentFiles([resourcePath]);
  }

  await deleteMaterial(id);
}

// -- Students ---------------------------------------------------------------------

type RemoveStudentInput = {
  classroomId: string;
  classroomName: string;
  studentId: string;
};

export async function removeStudent({
  classroomId,
  classroomName,
  studentId,
}: RemoveStudentInput): Promise<void> {
  // 1. End the enrolment.
  await removeEnrolment(studentId, classroomId).catch((removeError) => {
    throw new DataError("This student could not be removed. Please try again.", removeError);
  });

  // 2. Tell the student (best effort).
  await notifyUser({
    recipient_id: studentId,
    type: "removed_from_classroom",
    title: "You were removed from a classroom",
    body: `You were removed from "${classroomName}".`,
    link_url: "/student/classrooms",
  });
}
