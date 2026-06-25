import { NextRequest, NextResponse } from "next/server";
import { pipeline, avgFromHgetall } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { albumId, userId, rating } = await req.json() as {
    albumId: string; userId: string; rating: number;
  };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!albumId || !userId || UUID_RE.test(userId))
    return NextResponse.json({ error: "username required to rate" }, { status: 403 });
  if (typeof rating !== "number" || rating < 0 || rating > 100)
    return NextResponse.json({ error: "rating must be 0-100" }, { status: 400 });

  const key = `r:${albumId}`;
  const cmd = rating === 0
    ? ["HDEL", key, userId]
    : ["HSET", key, userId, String(rating)];

  const [, hgetallRes] = await pipeline([cmd, ["HGETALL", key]]);
  const average = avgFromHgetall(hgetallRes.result);

  return NextResponse.json({ average });
}
