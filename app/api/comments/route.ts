import { NextRequest, NextResponse } from "next/server";
import { pipeline, parseHgetall } from "@/lib/redis";
import type { GifComment } from "@/types";

function commentKey(albumId: string) { return `c:${albumId}`; }

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ comments: [] });

  const [res] = await pipeline([["HGETALL", commentKey(albumId)]]);
  const raw = parseHgetall(res.result);

  const comments: GifComment[] = Object.values(raw)
    .map((v) => { try { return JSON.parse(v) as GifComment; } catch { return null; } })
    .filter(Boolean) as GifComment[];

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

  await pipeline([
    ["HSET", commentKey(albumId), comment.id, JSON.stringify(comment)],
    ["HSET", "c:last-comment", albumId, String(comment.timestamp)],
  ]);
  return NextResponse.json({ comment });
}

export async function DELETE(req: NextRequest) {
  const { albumId, commentId, visitorId } = await req.json() as {
    albumId: string; commentId: string; visitorId: string;
  };
  if (!albumId || !commentId || !visitorId)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const [res] = await pipeline([["HGET", commentKey(albumId), commentId]]);
  if (!res.result) return NextResponse.json({ error: "not found" }, { status: 404 });

  let comment: GifComment;
  try { comment = JSON.parse(res.result as string); }
  catch { return NextResponse.json({ error: "parse error" }, { status: 500 }); }

  if (comment.visitorId !== visitorId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await pipeline([["HDEL", commentKey(albumId), commentId]]);
  return NextResponse.json({ ok: true });
}
