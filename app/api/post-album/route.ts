import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export async function POST(req: Request) {
  const body = await req.json();
  const { album, artist, artworkUrl, spotifyUri, releaseDate, summary, labels, genre, tags, creatorName, userId } = body;

  if (!album?.trim() || !artist?.trim() || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id        = `dyn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdTs = new Date().toISOString();
  const timestamp = Date.now();

  const hsetArgs: (string | number)[] = [
    `post:${id}`,
    "album",       String(album).trim(),
    "artist",      String(artist).trim(),
    "artworkUrl",  String(artworkUrl ?? ""),
    "spotifyUri",  String(spotifyUri ?? ""),
    "releaseDate", String(releaseDate ?? ""),
    "summary",     String(summary ?? ""),
    "labels",      JSON.stringify(Array.isArray(labels) ? labels : []),
    "genre",       JSON.stringify(Array.isArray(genre)  ? genre  : []),
    "tags",        JSON.stringify(Array.isArray(tags)   ? tags   : []),
    "creatorName", String(creatorName ?? "Anonymous"),
    "userId",      String(userId ?? ""),
    "createdTs",   createdTs,
    "score",       "0",
    "stars",       "0",
    "commentCount","0",
  ];

  await pipeline([
    ["ZADD", "dyn_posts", timestamp, id],
    ["HSET", ...hsetArgs],
  ]);

  return NextResponse.json({ id, createdTs });
}
