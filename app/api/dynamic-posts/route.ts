import { NextResponse } from "next/server";
import { ref } from "@/lib/firebase-admin";
import type { Album } from "@/types";
import type { DataSnapshot } from "firebase-admin/database";

export async function GET() {
  const snap = await ref("posts").get();
  if (!snap.exists()) return NextResponse.json({ albums: [] });

  const albums: Album[] = [];
  snap.forEach((child: DataSnapshot) => {
    const d = child.val();
    albums.push({
      id:          child.key!,
      title:       d.album   ?? "",
      artist:      d.artist  ?? "",
      year:        parseInt(d.releaseDate?.slice(0, 4) ?? "0") || 0,
      artworkUrl:  d.artworkUrl ?? "",
      spotifyUri:  d.spotifyUri ?? "",
      description: d.summary || undefined,
      labels:      Array.isArray(d.labels) ? d.labels : [],
      genre:       Array.isArray(d.genre)  ? d.genre  : [],
      tags:        Array.isArray(d.tags)   ? d.tags   : [],
      creatorName: d.creatorName ?? "",
      userId:      d.userId || undefined,
      createdTs:   d.createdTs ?? "",
      postOrder:   d.postOrder ?? 0,
      legacyScore: 0,
      legacyStars: 0,
    });
  });

  // sort descending — highest postOrder (most recent timestamp) first
  albums.sort((a, b) => (b.postOrder ?? 0) - (a.postOrder ?? 0));

  return NextResponse.json({ albums });
}
