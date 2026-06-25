import { NextResponse } from "next/server";
import { pipeline, parseHgetall } from "@/lib/redis";

export async function DELETE(req: Request) {
  const { id, userId } = await req.json();
  if (!id || !userId) return NextResponse.json({ error: "Missing id or userId" }, { status: 400 });

  const [postRes] = await pipeline([["HGETALL", `post:${id}`]]);
  const post = parseHgetall(postRes.result);

  if (!post.userId) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.userId !== userId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await pipeline([
    ["ZREM", "dyn_posts", id],
    ["DEL", `post:${id}`],
  ]);

  return NextResponse.json({ ok: true });
}
