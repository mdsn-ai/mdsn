export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const MAX_INPUT_LENGTH = 10000;
export const MAX_IDENTIFIER_LENGTH = 256;

export function validateInputLength(value: string, maxLength: number = MAX_INPUT_LENGTH): void {
  if (value.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }
}

export function trimTrailingBlankLines(value: string): string {
  return value.replace(/\n+$/u, "\n");
}
