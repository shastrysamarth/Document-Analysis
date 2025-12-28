// lib/safety/redact.ts
export function redactPII(text: string) {
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
      .replace(/\b\d{16}\b/g, "[REDACTED_CARD]");
  }
  