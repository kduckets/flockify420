import { NextRequest, NextResponse } from "next/server";
import { pipeline, scoreFromHgetall } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { albumId, userId, vote } = await req.json() as {
    albumId: string; userId: string; vote: -1 | 1 | 2 | 0;
  };

  if (!albumId || !userId)
    return NextResponse.json({ error: "missing albumId or userId" }, { status: 400 });

  if (vote !== -1 && vote !== 1 && vote !== 2 && vote !== 0)
    return NextResponse.json({ error: "invalid vote value" }, { status: 400 });

  const key = `v:${albumId}`;
  const cmd = vote === 0
    ? ["HDEL", key, userId]
    : ["HSET", key, userId, String(vote)];

  const [, hgetallRes] = await pipeline([cmd, ["HGETALL", key]]);
  const { score, count, stars } = scoreFromHgetall(hgetallRes.result);

  return NextResponse.json({ score, voterCount: count, starCount: stars });
}
