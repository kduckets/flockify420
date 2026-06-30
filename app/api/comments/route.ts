import { NextRequest, NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";
import type { GifComment } from "@/types";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ comments: [] });

  const snap = await ref(`comments/${albumId}`).get();
  const val = snap.val() as Record<string, GifComment> | null;

  const comments: GifComment[] = val ? Object.values(val) : [];
  comments.sort((a, b) => a.timestamp - b.timestamp);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const { albumId, gifUrl, author, visitorId } = await req.json() as {
    albumId: string; gifUrl: string; author: string; visitorId: string;
  };
  if (!albumId || !gifUrl || !visitorId)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const comment: GifComment = {
    id: crypto.randomUUID(),
    albumId,
    gifUrl,
    author: (author ?? "").trim(),
    visitorId,
    timestamp: Date.now(),
  };

  await Promise.all([
    ref(`comments/${albumId}/${comment.id}`).set(comment),
    ref(`lastComment/${albumId}`).set(comment.timestamp),
  ]);

  return NextResponse.json({ comment });
}

export async function DELETE(req: NextRequest) {
  const { albumId, commentId, visitorId } = await req.json() as {
    albumId: string; commentId: string; visitorId: string;
  };
  if (!albumId || !commentId || !visitorId)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const snap = await ref(`comments/${albumId}/${commentId}`).get();
  if (!snap.exists()) return NextResponse.json({ error: "not found" }, { status: 404 });

  const comment = snap.val() as GifComment;
  if (comment.visitorId !== visitorId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await ref(`comments/${albumId}/${commentId}`).remove();
  return NextResponse.json({ ok: true });
}
