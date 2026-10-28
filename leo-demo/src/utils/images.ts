// -----------------------------------------------------------------------------
// Image Helpers
//
// Every image the app shows lives in the public "images" storage bucket:
//   classroomImgs/                       classroom covers
//   classroomImgs/classroomReportImgs/   sharper covers for the reports
//   lessonImgs/                          lesson covers
//   projectimgs/                         decorative artwork
//   flashcards/                          images teachers upload for flashcards
//
// These helpers turn a stored path into a URL, replace any image that fails to
// load with a single placeholder, and spot tall (portrait) covers.
// -----------------------------------------------------------------------------

import type { SyntheticEvent } from "react";
import { publicImageUrl } from "../data/imageFiles";

export function bucketImageUrl(path: string): string {
  return publicImageUrl(path);
}

export function projectImageUrl(fileName: string): string {
  return bucketImageUrl(`projectimgs/${fileName}`);
}

export const BROKEN_IMAGE_URL = projectImageUrl("broken.png");

// For optional covers: a missing path shows the same placeholder as a failed load.
export function bucketImageUrlOrBroken(path: string | null | undefined): string {
  return path ? bucketImageUrl(path) : BROKEN_IMAGE_URL;
}

// The classroom reports stretch a cover across a wide banner, where the
// regular covers (at most 800px) look pixelated. classroomImgs/classroomReportImgs/
// holds sharper copies of the built-in covers under the same names, most as
// WebP. Keyed by the cover's name without its extension; any other cover
// falls back to the regular one.
const REPORT_COVER_FOLDER = "classroomImgs/classroomReportImgs";

const REPORT_COVER_FILES: Record<string, string> = {
  fetchbook: "fetchbook.webp",
  libIl: "libIl.webp",
  "Nerd-amico": "Nerd-amico.webp",
  desktopwindowspeople: "desktopwindowspeople.webp",
  dinosaurpeople: "dinosaurpeople.webp",
  kidletterdrawings: "kidletterdrawings.webp",
  guypatchclassroom: "guypatchclassroom.webp",
  englishHoldingBack: "englishHoldingBack.webp",
  "whitetopaz-beach-illustration": "whitetopaz-beach-illustration.jpg",
  "whitetopaz-girlreadingjungle": "whitetopaz-girlreadingjungle.jpg",
};

export function reportCoverUrl(path: string | null | undefined): string {
  const name = path?.match(/^classroomImgs\/([^/]+)\.\w+$/)?.[1];
  const reportFile = name ? REPORT_COVER_FILES[name] : undefined;

  if (reportFile) {
    return bucketImageUrl(`${REPORT_COVER_FOLDER}/${reportFile}`);
  }

  return bucketImageUrlOrBroken(path);
}

// An onLoad handler for covers fitted whole into a wide box (object-contain),
// where a tall picture shrinks to a thin strip in the middle. It marks tall
// pictures with data-portrait, so `data-portrait:object-cover` lets them fill
// the box instead. Square and wide pictures are left exactly as they were.
export function markPortraitImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.naturalHeight > image.naturalWidth) {
    image.dataset.portrait = "true";
  }
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
