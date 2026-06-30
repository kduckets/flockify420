import { NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const body = await req.json();
  const { id: clientId, album, artist, artworkUrl, spotifyUri, releaseDate, summary, labels, genre, tags, creatorName, userId } = body;

  if (!album?.trim() || !artist?.trim() || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id        = (typeof clientId === "string" && clientId.startsWith("dyn_")) ? clientId : `dyn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdTs = new Date().toISOString();
  const timestamp = Date.now();

  await ref(`posts/${id}`).set({
    album:       String(album).trim(),
    artist:      String(artist).trim(),
    artworkUrl:  String(artworkUrl ?? ""),
    spotifyUri:  String(spotifyUri ?? ""),
    releaseDate: String(releaseDate ?? ""),
    summary:     String(summary ?? ""),
    labels:      Array.isArray(labels) ? labels : [],
    genre:       Array.isArray(genre)  ? genre  : [],
    tags:        Array.isArray(tags)   ? tags   : [],
    creatorName: String(creatorName ?? "Anonymous"),
    userId:      String(userId ?? ""),
    createdTs,
    postOrder:   timestamp,
  });

  return NextResponse.json({ id, createdTs });
}
