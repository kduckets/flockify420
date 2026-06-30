import { NextRequest, NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";
import type { VoteValue } from "@/store/albumStore";

export async function POST(req: NextRequest) {
  const { userId, albumIds } = await req.json() as { userId: string; albumIds: string[] };
  if (!userId || !albumIds?.length) return NextResponse.json({ votes: {} });

  const results = await Promise.all(
    albumIds.map((id) => ref(`votes/${id}/${userId}`).get())
  );

  const votes: Record<string, VoteValue> = {};
  albumIds.forEach((id, i) => {
    const val = Number(results[i].val());
    if (val === -1 || val === 1 || val === 2) votes[id] = val as VoteValue;
  });

  return NextResponse.json({ votes });
}
