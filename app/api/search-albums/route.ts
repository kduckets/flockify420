import { NextResponse } from "next/server";

interface ItunesResult {
  collectionType?: string;
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  releaseDate?: string;
  primaryGenreName?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&media=music&limit=20`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    const results = (data.results ?? [])
      .filter((r: ItunesResult) => r.collectionType === "Album")
      .map((r: ItunesResult) => ({
        id: String(r.collectionId),
        album: r.collectionName,
        artist: r.artistName,
        artworkUrl: (r.artworkUrl100 ?? "").replace("100x100bb", "600x600bb"),
        releaseDate: r.releaseDate ? r.releaseDate.slice(0, 4) : "",
        genre: r.primaryGenreName ? [r.primaryGenreName] : [],
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
