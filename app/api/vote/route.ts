import { NextRequest, NextResponse } from "next/server";
import { ref, scoreFromVotes } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const { albumId, userId, vote } = await req.json() as {
    albumId: string; userId: string; vote: -1 | 1 | 2 | 0;
  };

  if (!albumId || !userId)
    return NextResponse.json({ error: "missing albumId or userId" }, { status: 400 });

  if (vote !== -1 && vote !== 1 && vote !== 2 && vote !== 0)
    return NextResponse.json({ error: "invalid vote value" }, { status: 400 });

  const voteRef = ref(`votes/${albumId}/${userId}`);

  if (vote === 0) {
    await voteRef.remove();
  } else {
    await voteRef.set(vote);
  }

  const votesSnap = await ref(`votes/${albumId}`).get();
  const { score, count, stars } = scoreFromVotes(votesSnap.val());

  return NextResponse.json({ score, voterCount: count, starCount: stars });
}
