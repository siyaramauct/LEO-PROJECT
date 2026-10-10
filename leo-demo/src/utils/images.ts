// -----------------------------------------------------------------------------
// Image Helpers
//
// Every image the app shows lives in the public "images" storage bucket:
//   classroomImgs/   classroom covers
//   lessonImgs/      lesson covers
//   projectimgs/     decorative artwork
//   flashcards/      images teachers upload for flashcards
//
// These helpers turn a stored path into a URL, and replace any image that
// fails to load with a single placeholder.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";

export function bucketImageUrl(path: string): string {
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export function projectImageUrl(fileName: string): string {
  return bucketImageUrl(`projectimgs/${fileName}`);
}

export const BROKEN_IMAGE_URL = projectImageUrl("broken.png");

// For optional covers: a missing path shows the same placeholder as a failed load.
export function bucketImageUrlOrBroken(path: string | null | undefined): string {
  return path ? bucketImageUrl(path) : BROKEN_IMAGE_URL;
}

// Called once in main.tsx. Image error events don't bubble up the page, so the
// listener runs in the capture phase to see every failed image, app-wide.
export function installBrokenImageFallback() {
  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.brokenFallback) return;

      // Mark the image first, so a failing placeholder can't loop forever.
      image.dataset.brokenFallback = "true";
      image.src = BROKEN_IMAGE_URL;
    },
    true,
  );
}
