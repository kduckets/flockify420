import { NextRequest, NextResponse } from "next/server";
import { pipeline, scoreFromHgetall } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { albumId, userId, vote } = await req.json() as {
    albumId: string; userId: string; vote: -1 | 1 | 2 | 0;
  };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!albumId || !userId || UUID_RE.test(userId))
    return NextResponse.json({ error: "username required to vote" }, { status: 403 });

  if (vote !== -1 && vote !== 1 && vote !== 2 && vote !== 0)
    return NextResponse.json({ error: "invalid vote value" }, { status: 400 });

  const key = `v:${albumId}`;
  const cmd = vote === 0
    ? ["HDEL", key, userId]
    : ["HSET", key, userId, String(vote)];

  const [, hgetallRes] = await pipeline([cmd, ["HGETALL", key]]);
  const { score, count } = scoreFromHgetall(hgetallRes.result);

  return NextResponse.json({ score, voterCount: count });
}
