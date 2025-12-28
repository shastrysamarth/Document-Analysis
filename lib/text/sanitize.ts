// lib/text/sanitize.ts
export function sanitizeForPostgresText(input: string): string {
    // Postgres TEXT cannot contain NUL (\u0000).
    // Also strip other non-printing control chars (optional, but helps).
    return input
      .replace(/\u0000/g, "") // remove NULs
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // keep \t \n \r, strip others
  }
  