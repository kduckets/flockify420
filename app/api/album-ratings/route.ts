import { NextRequest, NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ ratings: {} });

  const snap = await ref(`votes/${albumId}`).get();
  const val = snap.val() as Record<string, number> | null;

  const ratings: Record<string, number> = {};
  if (val) {
    for (const [userId, vote] of Object.entries(val)) {
      if (userId === "__offset__") continue;
      const n = Number(vote);
      if (n === -1 || n === 1 || n === 2) ratings[userId] = n;
    }
  }

  return NextResponse.json({ ratings });
}
