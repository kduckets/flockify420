import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { userId, albumIds } = await req.json() as { userId: string; albumIds: string[] };
  if (!userId || !albumIds?.length) return NextResponse.json({ ratings: {} });

  const results = await pipeline(albumIds.map((id) => ["HGET", `r:${id}`, userId]));

  const ratings: Record<string, number> = {};
  albumIds.forEach((id, i) => {
    const val = Number(results[i]?.result);
    if (val > 0 && val <= 100) ratings[id] = val;
  });

  return NextResponse.json({ ratings });
}
