// -----------------------------------------------------------------------------
// Materials
//
// The files and links teachers share (learning_resources). A material belongs
// to a classroom; when lesson_id is set it belongs to that lesson instead.
// Documents are stored in the "documents" storage bucket and the row holds
// their storage path; links hold the web address.
//
// Every function throws a DataError when Supabase reports a problem, except
// the URL helpers, which log and fall back.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";

export type Material = {
  resource_id: string;
  resource_type: "document" | "link";
  resource_url: string; // Storage path for documents, web address for links.
  uploaded_date: string;
};

const MATERIAL_COLUMNS = "resource_id, resource_type, resource_url, uploaded_date";

// -- Reading -------------------------------------------------------------------

// The classroom-wide materials (not attached to a lesson), newest first.
export async function getClassroomMaterials(classroomId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("learning_resources")
    .select(MATERIAL_COLUMNS)
    .eq("classroom_id", classroomId)
    .is("lesson_id", null)
    .order("uploaded_date", { ascending: false });

  if (error) {
    throw new DataError("Classroom materials could not be loaded right now.", error);
  }

  return data as Material[];
}

// The documents attached to one lesson, newest first.
export async function getLessonDocuments(lessonId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("learning_resources")
    .select(MATERIAL_COLUMNS)
    .eq("lesson_id", lessonId)
    .eq("resource_type", "document")
    .order("uploaded_date", { ascending: false });

  if (error) {
    throw new DataError("Lesson documents could not be loaded right now.", error);
  }

  return data as Material[];
}

// -- Writing -------------------------------------------------------------------

type NewMaterial = {
  classroomId: string;
  lessonId?: string;
  type: "document" | "link";
  url: string; // Storage path for documents, web address for links.
};

export async function addMaterial({ classroomId, lessonId, type, url }: NewMaterial) {
  const { data, error } = await supabase
    .from("learning_resources")
    .insert({
      classroom_id: classroomId,
      lesson_id: lessonId ?? null,
      resource_type: type,
      resource_url: url,
    })
    .select(MATERIAL_COLUMNS)
    .single();

  if (error) {
    throw new DataError("The material could not be shared with learners. Please try again.", error);
  }

  return data as Material;
}

export async function deleteMaterial(resourceId: string): Promise<void> {
  const { error } = await supabase
    .from("learning_resources")
    .delete()
    .eq("resource_id", resourceId);

  if (error) {
    throw new DataError("This material could not be deleted. Please try again.", error);
  }
}

// -- Document storage ------------------------------------------------------------

export async function uploadDocument(
  storagePath: string,
  file: File,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType, upsert: false });

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The document could not be uploaded. Please try again."),
      error,
    );
  }
}

// Best effort: a file left behind in storage is logged, not shown.
export async function removeDocumentFiles(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from("documents").remove(storagePaths);

  if (error) {
    console.error("Failed to delete document from storage:", error);
  }
}

// The address a material opens at. Links (and older rows that stored a full
// URL) are used as they are; documents open from the documents bucket.
export function materialUrl(material: Pick<Material, "resource_type" | "resource_url">) {
  const isWebAddress = /^https?:\/\//i.test(material.resource_url);

  if (material.resource_type === "link" || isWebAddress) {
    return material.resource_url;
  }

  return supabase.storage.from("documents").getPublicUrl(material.resource_url).data.publicUrl;
}

// A link to a stored document that works for the given number of seconds.
// Returns "" if signing fails.
export async function signDocumentUrl(storagePath: string, seconds: number): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, seconds);

  if (error) {
    console.error("Could not sign lesson document:", error);
    return "";
  }

  return data.signedUrl;
}

// Records several uploaded documents against one lesson.
export async function addLessonDocuments(
  classroomId: string,
  lessonId: string,
  storagePaths: string[],
): Promise<void> {
  const { error } = await supabase.from("learning_resources").insert(
    storagePaths.map((storagePath) => ({
      classroom_id: classroomId,
      lesson_id: lessonId,
      resource_type: "document",
      resource_url: storagePath,
    })),
  );

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The lesson documents could not be attached. Please try again."),
      error,
    );
  }
}
