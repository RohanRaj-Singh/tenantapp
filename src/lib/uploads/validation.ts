/**
 * Shared upload validation utilities.
 *
 * These are pure functions with no dependencies on app-specific storage
 * logic. They can be copied between projects without modification.
 * This copy lives in the tenant app for receipt upload validation.
 */

/**
 * Check whether a MIME type is in the allowed list.
 */
export function isAllowedMimeType(mime: string, allowed: string[]): boolean {
  return allowed.includes(mime);
}

/**
 * Check whether a file extension is in the allowed list.
 */
export function isAllowedExtension(filename: string, allowed: string[]): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  const ext = filename.slice(dot).toLowerCase();
  return allowed.includes(ext);
}

/**
 * Validate that a file size does not exceed the maximum.
 * Returns an error message string, or null if valid.
 */
export function validateFileSize(size: number, maxBytes: number): string | null {
  if (size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return `File must be ${mb} MB or smaller.`;
  }
  return null;
}

/**
 * Sanitize a filename for safe storage: remove path separators, special
 * characters, and limit length. Replaces unsafe characters with underscores.
 */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_");
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

/**
 * Assert that a resolved file path stays within the allowed root directory.
 */
export function assertSafeDirectoryPath(
  filePath: string,
  allowedRoot: string,
): void {
  if (!filePath.startsWith(allowedRoot)) {
    throw new Error("Resolved path is outside the allowed directory.");
  }
}
