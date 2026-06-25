import { NextResponse } from "next/server";
import { pipeline, parseHgetall } from "@/lib/redis";
import type { Album } from "@/types";

export async function GET() {
  // Newest first
  const [zrangeRes] = await pipeline([["ZREVRANGE", "dyn_posts", "0", "-1"]]);
  const ids = (zrangeRes.result as string[] | null) ?? [];
  if (ids.length === 0) return NextResponse.json({ albums: [] });

  const results = await pipeline(ids.map((id) => ["HGETALL", `post:${id}`]));

  const albums: Album[] = results.map((r, i) => {
    const d = parseHgetall(r.result);
    const parseArr = (s: string | undefined): string[] => {
      try { return JSON.parse(s ?? "[]"); } catch { return []; }
    };
    const createdTs = d.createdTs ?? "";
    return {
      id:          ids[i],
      title:       d.album   ?? "",
      artist:      d.artist  ?? "",
      year:        parseInt(d.releaseDate?.slice(0, 4) ?? "0") || 0,
      artworkUrl:  d.artworkUrl ?? "",
      spotifyUri:  d.spotifyUri ?? "",
      description: d.summary   || undefined,
      labels:      parseArr(d.labels),
      genre:       parseArr(d.genre),
      tags:        parseArr(d.tags),
      creatorName: d.creatorName ?? "",
      createdTs,
      postOrder:   new Date(createdTs).getTime() || Date.now(),
      legacyScore: 0,
      legacyStars: 0,
    };
  });

  return NextResponse.json({ albums });
}
