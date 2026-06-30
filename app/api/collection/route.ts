import { NextRequest, NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ saved: [] });

  const snap = await ref(`collections/${userId}`).get();
  const val = snap.val() as Record<string, boolean> | null;
  const saved = val ? Object.keys(val) : [];
  return NextResponse.json({ saved });
}

export async function POST(req: NextRequest) {
  const { userId, albumId, save } = await req.json() as {
    userId: string; albumId: string; save: boolean;
  };
  if (!userId || !albumId) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  if (save) {
    await ref(`collections/${userId}/${albumId}`).set(true);
  } else {
    await ref(`collections/${userId}/${albumId}`).remove();
  }

  return NextResponse.json({ ok: true });
}
