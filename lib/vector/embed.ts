// lib/vector/embed.ts
import OpenAI from "openai";
import { db } from "../db";

const openai = new OpenAI();

export async function embedAndStore(docId: string, text: string) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  await db.$executeRawUnsafe(
    `
    INSERT INTO "DocumentEmbedding"(id, "documentId", vector)
    VALUES (gen_random_uuid(), $1, $2)
    `,
    docId,
    embedding.data[0].embedding
  );
}
