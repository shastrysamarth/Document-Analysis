// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { extractTextFromFile } from "@/lib/ocr/ocr";
import { redactPII } from "@/lib/safety/redact";
import { sanitizeForPostgresText } from "@/lib/text/sanitize";
import { discoverSchemaAndExtract } from "@/lib/llm/schemaDiscovery";
import { embedAndStore } from "@/lib/vector/embed";

export const runtime = "nodejs"; // needed for pdf-parse (Buffer) + file handling

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // 1) Extract raw text (PDF/text). Images/scans will currently return "" until you add OCR.
    const rawText = await extractTextFromFile(file);

    // 2) Sanitize for Postgres (strip NUL bytes, etc.)
    const cleanText = sanitizeForPostgresText(rawText);

    // 3) Redact PII (your implementation)
    const redacted = redactPII(cleanText);

    // 4) Discover schema + extract structured fields
    const { schema, extracted, confidence } = await discoverSchemaAndExtract(redacted);

    // 5) Persist document
    const doc = await db.document.create({
      data: {
        filename: file.name,
        text: redacted,
        schema,
        extracted,
        confidence,
        status: "REVIEW_REQUIRED",
      },
    });

    // 6) Embed + store (skip if text is empty)
    if (redacted.trim().length >= 20) {
      await embedAndStore(doc.id, redacted);
    }

    return NextResponse.json({ documentId: doc.id });
  } catch (err: any) {
    console.error("ingest failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
