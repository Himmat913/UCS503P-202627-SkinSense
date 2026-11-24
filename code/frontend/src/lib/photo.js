import { formatBytes } from "./skin";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const TYPE_LABELS = { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP" };

/** Returns an error message for a file the backend would reject, else null. */
export function checkFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "That file type isn't supported. Choose a JPG, PNG or WEBP photo.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That photo is ${formatBytes(file.size)}. The limit is 10 MB, so try a smaller one.`;
  }
  return null;
}
