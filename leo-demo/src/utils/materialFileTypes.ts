// -----------------------------------------------------------------------------
// Classroom Material File Types
//
// Which files teachers may upload as classroom materials, and how each one is
// labelled in the materials list.
// -----------------------------------------------------------------------------

// Allowed extensions and the MIME type sent to Storage. The type is set
// explicitly because browsers often leave File.type empty for Office files.
const MATERIAL_FILE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// For the file picker's accept attribute. It only filters the dialog, so
// uploads are still checked with validateMaterialFile.
export const MATERIAL_FILE_ACCEPT = Object.keys(MATERIAL_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export const MATERIAL_FILE_LABEL = "PNG, JPG, PDF, DOC, DOCX or XLSX";

const fileExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
};

// Short tag shown beside a material, e.g. "PDF" or "LINK". Documents are stored
// by path, so the extension comes from that path.
export const materialTypeLabel = (resourceType: "document" | "link", path: string) =>
  resourceType === "link" ? "LINK" : fileExtension(path.split("?")[0]).toUpperCase() || "FILE";

// Returns the content type to upload with, or an error message for a disallowed file.
export function validateMaterialFile(file: File): { contentType: string } | { error: string } {
  const extension = fileExtension(file.name);
  const contentType = MATERIAL_FILE_TYPES[extension];

  if (!contentType) {
    const reason = extension
      ? `because .${extension} files aren't supported`
      : "because it has no file extension";
    return {
      error: `"${file.name}" can't be uploaded ${reason}. Choose a ${MATERIAL_FILE_LABEL} file.`,
    };
  }

  return { contentType };
}
