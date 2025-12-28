// lib/db.ts
import { PrismaClient } from "@prisma/client";

/**
 * Prevent multiple Prisma instances in development
 * (Next.js hot reload causes connection exhaustion otherwise)
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Ensure pgvector extension exists.
 * Safe to call on boot or first query.
 */
export async function ensureVectorExtension() {
  await db.$executeRawUnsafe(`
    CREATE EXTENSION IF NOT EXISTS vector;
  `);
}

/**
 * Helper for raw pgvector similarity search
 */
export async function vectorSearch(
  embedding: number[],
  limit = 5
): Promise<any[]> {
  return db.$queryRawUnsafe(
    `
    SELECT d.*, e.vector <-> $1 AS distance
    FROM "DocumentEmbedding" e
    JOIN "Document" d ON d.id = e."documentId"
    ORDER BY e.vector <-> $1
    LIMIT $2
    `,
    embedding,
    limit
  );
}

/**
 * Graceful shutdown (important for Docker / AWS)
 */
export async function disconnectDB() {
  await db.$disconnect();
}
