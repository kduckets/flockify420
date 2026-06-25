import { NextRequest, NextResponse } from "next/server";
import { pipeline, parseHgetall } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ ratings: {} });

  const results = await pipeline([["HGETALL", `v:${albumId}`]]);
  const raw = parseHgetall(results[0]?.result);

  const ratings: Record<string, number> = {};
  for (const [userId, val] of Object.entries(raw)) {
    const n = Number(val);
    if (n === -1 || n === 1 || n === 2) ratings[userId] = n;
  }

  return NextResponse.json({ ratings });
}
