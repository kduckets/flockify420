import { NextRequest, NextResponse } from "next/server";
import { ref, scoreFromVotes } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const { ids }: { ids: string[] } = await req.json();
  if (!ids?.length) return NextResponse.json({ scores: {}, commentCounts: {}, voterCounts: {} });

  const [votesSnap, commentsSnap, lastCommentSnap] = await Promise.all([
    ref("votes").get(),
    ref("comments").get(),
    ref("lastComment").get(),
  ]);

  const votesVal = (votesSnap.val() ?? {}) as Record<string, Record<string, number | string>>;
  const commentsVal = (commentsSnap.val() ?? {}) as Record<string, Record<string, unknown>>;

  const scores: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  const voterCounts: Record<string, number> = {};
  const starCounts: Record<string, number> = {};

  ids.forEach((id) => {
    const { score, count, stars } = scoreFromVotes(votesVal[id] ?? null);
    if (count > 0) {
      scores[id] = score;
      voterCounts[id] = count;
      if (stars > 0) starCounts[id] = stars;
    }

    const albumComments = commentsVal[id];
    const commentCount = albumComments ? Object.keys(albumComments).length : 0;
    if (commentCount > 0) commentCounts[id] = commentCount;
  });

  const lastCommentAt: Record<string, number> = {};
  const lastCommentVal = lastCommentSnap.val() as Record<string, number> | null;
  if (lastCommentVal) {
    for (const [albumId, ts] of Object.entries(lastCommentVal)) {
      if (!isNaN(Number(ts))) lastCommentAt[albumId] = Number(ts);
    }
  }

  return NextResponse.json({ scores, commentCounts, lastCommentAt, voterCounts, starCounts });
}
