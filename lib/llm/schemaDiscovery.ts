// lib/llm/schemaDiscovery.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Discovered = {
  schema: Record<string, any>;
  extracted: Record<string, any>;
  confidence: Record<string, number>;
};

export async function discoverSchemaAndExtract(text: string): Promise<Discovered> {
  // Keep token size sane
  const input = text.length > 40_000 ? text.slice(0, 40_000) : text;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are a document intelligence engine.",
          "Given raw document text, return ONE JSON object with EXACT keys:",
          "{ schema, extracted, confidence }.",
          "",
          "schema: a JSON Schema (draft-07-ish) for the extracted object.",
          "extracted: the populated fields.",
          "confidence: per-field confidence numbers in [0,1].",
          "",
          "The extracted object MUST follow this structure (use null if unknown):",
          "{",
          '  "doc_type": "resume" | "cover_letter" | "invoice" | "unknown",',
          '  "person": { "name": string|null, "email": string|null, "phone": string|null, "links": string[] },',
          '  "summary": string|null,',
          '  "skills": string[],',
          '  "experience": [{ "company": string|null, "title": string|null, "start_date": string|null, "end_date": string|null, "bullets": string[] }],',
          '  "education": [{ "school": string|null, "degree": string|null, "field": string|null, "start_date": string|null, "end_date": string|null }],',
          '  "raw_highlights": string[]',
          "}",
          "",
          "Rules:",
          "- Output valid JSON only (no markdown).",
          "- Use arrays even if empty.",
          "- Dates should be strings like '2024-05' or '2024' when possible, else null.",
          "- confidence should include keys matching extracted fields paths where possible.",
        ].join("\n"),
      },
      {
        role: "user",
        content: input || "(empty)",
      },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");

  const parsed = JSON.parse(content);

  // Minimal guardrails so your app doesn't explode
  return {
    schema: parsed.schema ?? {},
    extracted: parsed.extracted ?? {},
    confidence: parsed.confidence ?? {},
  };
}
