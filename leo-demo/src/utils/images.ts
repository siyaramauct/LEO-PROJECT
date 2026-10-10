import { supabase } from "../supabase-client";

// Every image the app renders lives in the public "images" bucket:
// classroomImgs/ (classroom covers), lessonImgs/ (lesson covers),
// projectimgs/ (decorative artwork) and flashcards/ (uploaded card images).

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

// <img> error events don't bubble, so listen in the capture phase to catch
// every failed image once, app-wide, and swap in the bucket placeholder.
export function installBrokenImageFallback() {
  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.brokenFallback) return;
      // Flag first so a failing placeholder can't trigger an endless retry loop.
      image.dataset.brokenFallback = "true";
      image.src = BROKEN_IMAGE_URL;
    },
    true,
  );
}
