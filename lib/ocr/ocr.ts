// lib/ocr/ocr.ts
import { extractText } from "unpdf";

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith("text/")) return await file.text();

  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab); // ✅ what unpdf expects

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const out = await extractText(bytes, { mergePages: true });
    // out.text can be string or string[]
    return out.text;
  }

  return "";
}
