/** Joins non-blank fields with a separator, skipping blanks instead of leaving a dangling
 * separator (e.g. "Position · " when Company is empty). Mirrors CvTextHelpers.Join on the backend. */
export function joinFields(separator: string, ...parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p ?? '').trim()).filter((p) => p.length > 0).join(separator);
}

/** Appends a detail in parentheses only when both base and detail are present; falls back to
 * whichever one exists rather than rendering a bare "()" or "Name ()". */
export function withDetail(base: string | null | undefined, detail: string | null | undefined): string {
  const b = (base ?? '').trim();
  const d = (detail ?? '').trim();
  if (b && d) return `${b} (${d})`;
  return b || d;
}
