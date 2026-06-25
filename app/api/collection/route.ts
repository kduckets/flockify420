import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

// GET ?userId=X  → returns { saved: string[] }
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ saved: [] });
  const results = await pipeline([["SMEMBERS", `col:${userId}`]]);
  const members = Array.isArray(results[0]?.result) ? (results[0].result as string[]) : [];
  return NextResponse.json({ saved: members });
}

// POST { userId, albumId, save: boolean } → toggle membership
export async function POST(req: NextRequest) {
  const { userId, albumId, save } = await req.json() as {
    userId: string; albumId: string; save: boolean;
  };
  if (!userId || !albumId) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const cmd = save ? ["SADD", `col:${userId}`, albumId] : ["SREM", `col:${userId}`, albumId];
  await pipeline([cmd]);
  return NextResponse.json({ ok: true });
}
