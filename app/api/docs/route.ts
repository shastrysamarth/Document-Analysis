// app/api/docs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const docId = url.searchParams.get("doc");

  try {
    if (docId) {
      const doc = await db.document.findUnique({
        where: { id: docId },
        include: { embeddings: true },
      });

      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(doc);
    }

    const docs = await db.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(docs);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
