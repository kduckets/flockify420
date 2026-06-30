import { NextRequest, NextResponse } from "next/server";
import { ref, scoreFromVotes } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const { ids }: { ids: string[] } = await req.json();
  if (!ids?.length) return NextResponse.json({ scores: {}, commentCounts: {}, voterCounts: {} });

  const [votesResults, commentResults, lastCommentSnap] = await Promise.all([
    Promise.all(ids.map((id) => ref(`votes/${id}`).get())),
    Promise.all(ids.map((id) => ref(`comments/${id}`).get())),
    ref("lastComment").get(),
  ]);

  const scores: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  const voterCounts: Record<string, number> = {};
  const starCounts: Record<string, number> = {};

  ids.forEach((id, i) => {
    const { score, count, stars } = scoreFromVotes(votesResults[i].val());
    if (count > 0) {
      scores[id] = score;
      voterCounts[id] = count;
      if (stars > 0) starCounts[id] = stars;
    }

    const commentsVal = commentResults[i].val();
    const commentCount = commentsVal ? Object.keys(commentsVal).length : 0;
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
