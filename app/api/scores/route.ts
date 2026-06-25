import { NextRequest, NextResponse } from "next/server";
import { pipeline, scoreFromHgetall } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { ids }: { ids: string[] } = await req.json();
  if (!ids?.length) return NextResponse.json({ scores: {}, commentCounts: {}, voterCounts: {} });

  // Per-album: HGETALL v:{id} (votes) + HLEN c:{id} (comment count)
  // Plus one extra command for last-comment timestamps
  const cmds = [
    ...ids.flatMap((id) => [["HGETALL", `v:${id}`], ["HLEN", `c:${id}`]]),
    ["HGETALL", "c:last-comment"],
  ];
  const results = await pipeline(cmds);

  const scores: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  const voterCounts: Record<string, number> = {};
  const starCounts: Record<string, number> = {};

  ids.forEach((id, i) => {
    const raw = results[i * 2]?.result;
    const { score, count, stars } = scoreFromHgetall(raw);
    if (count > 0) {
      scores[id] = score;
      voterCounts[id] = count;
      if (stars > 0) starCounts[id] = stars;
    }
    const commentCount = typeof results[i * 2 + 1]?.result === "number"
      ? (results[i * 2 + 1].result as number)
      : 0;
    if (commentCount > 0) commentCounts[id] = commentCount;
  });

  // Last-comment timestamps (for recency sort)
  const lastCommentRaw = results[ids.length * 2]?.result;
  const lastCommentAt: Record<string, number> = {};
  if (Array.isArray(lastCommentRaw)) {
    for (let i = 0; i < lastCommentRaw.length - 1; i += 2) {
      const ts = Number(lastCommentRaw[i + 1]);
      if (!isNaN(ts)) lastCommentAt[String(lastCommentRaw[i])] = ts;
    }
  }

  return NextResponse.json({ scores, commentCounts, lastCommentAt, voterCounts, starCounts });
}
