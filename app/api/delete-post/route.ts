import { NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";

export async function DELETE(req: Request) {
  const { id, userId } = await req.json();
  if (!id || !userId) return NextResponse.json({ error: "Missing id or userId" }, { status: 400 });

  const snap = await ref(`posts/${id}`).get();
  if (!snap.exists()) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const post = snap.val();
  if (post.userId !== userId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await ref(`posts/${id}`).remove();

  return NextResponse.json({ ok: true });
}
