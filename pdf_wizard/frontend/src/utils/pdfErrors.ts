/**
 * Stable PDF error codes matching the Go PDFErrorCode constants.
 * The Go layer serializes errors as JSON: {"code":"...","message":"..."}.
 */
export const PDFErrorCode = {
  FONT_ENCODING: 'FONT_ENCODING',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  INVALID_INPUT: 'INVALID_INPUT',
  IO_ERROR: 'IO_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type PDFErrorCode = (typeof PDFErrorCode)[keyof typeof PDFErrorCode];

export interface PDFErrorPayload {
  code: PDFErrorCode;
  message: string;
}

/**
 * Attempts to parse a structured PDFError from a caught error value.
 * Wails surfaces Go errors as plain strings (the Error() return value),
 * so we try to JSON-parse the string to extract code + message.
 */
export function parsePDFError(err: unknown): PDFErrorPayload | null {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : null;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'code' in parsed &&
      'message' in parsed &&
      typeof (parsed as Record<string, unknown>).code === 'string' &&
      typeof (parsed as Record<string, unknown>).message === 'string'
    ) {
      return parsed as PDFErrorPayload;
    }
  } catch {
    // Not JSON — fall through
  }
  return null;
}

/**
 * Returns true if the caught error is a PDFError with the specified code.
 */
export function isPDFError(err: unknown, code: PDFErrorCode): boolean {
  const parsed = parsePDFError(err);
  return parsed !== null && parsed.code === code;
}
