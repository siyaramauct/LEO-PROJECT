// -----------------------------------------------------------------------------
// Image Files
//
// Uploads and removes pictures in the public "images" storage bucket, such as
// flashcard images, and gives their public address (used by utils/images.ts).
//
// Uploading throws a DataError; removing is best effort and only logs.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";

export async function uploadImage(storagePath: string, file: File): Promise<void> {
  const { error } = await supabase.storage
    .from("images")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The image could not be uploaded. Please try again."),
      error,
    );
  }
}

export async function removeImageFiles(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from("images").remove(storagePaths);

  if (error) {
    console.error("Could not remove flashcard image:", error);
  }
}

// The public address of a picture in the images bucket.
export function publicImageUrl(storagePath: string): string {
  return supabase.storage.from("images").getPublicUrl(storagePath).data.publicUrl;
}
