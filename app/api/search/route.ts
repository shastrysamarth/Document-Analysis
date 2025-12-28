// app/api/search/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { vector } = await req.json();

  const results = await db.$queryRawUnsafe(`
    SELECT d.*
    FROM "DocumentEmbedding" e
    JOIN "Document" d ON d.id = e."documentId"
    ORDER BY e.vector <-> $1
    LIMIT 5
  `, vector);

  return NextResponse.json(results);
}
