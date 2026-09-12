import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an auth-flow HTTP error into a locale key. `classify` gets a chance to recognize a
 * specific, safe-to-show case (e.g. wrong password, duplicate email) from the response; when it
 * returns null, the real error is logged to the console (for whoever has devtools open — the
 * admin/developer) and a generic "contact the administrator" key is returned instead. A visitor
 * must never see a raw server/network error message.
 */
export function describeAuthError(
  err: unknown,
  context: string,
  classify: (httpError: HttpErrorResponse) => string | null,
): string {
  const httpError = err instanceof HttpErrorResponse ? err : null;
  const specific = httpError ? classify(httpError) : null;
  if (specific) return specific;

  console.error(`${context} failed:`, httpError?.status, httpError?.statusText, httpError?.error ?? err);
  return 'auth.error.technical';
}

/** IdentityResult error codes (e.g. "DuplicateEmail", "PasswordRequiresDigit") from a 400 ValidationProblem body. */
export function identityErrorCodes(httpError: HttpErrorResponse): string[] {
  return Object.keys(httpError.error?.errors ?? {});
}
