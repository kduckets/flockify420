import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist")?.trim();
  const album  = searchParams.get("album")?.trim();
  if (!artist || !album) return NextResponse.json({ genre: [], styles: [], labels: [] });

  const token = process.env.DISCOGS_TOKEN;
  const headers: Record<string, string> = {
    "User-Agent": "Flockify420/1.0 (kmditroia@gmail.com)",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Discogs token=${token}`;

  try {
    const url = `https://api.discogs.com/database/search?type=master&release_title=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}&per_page=5`;
    const res = await fetch(url, { headers, next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ genre: [], styles: [], labels: [] });

    const data = await res.json();
    const results: { genre?: string[]; style?: string[]; label?: string[] }[] = data.results ?? [];

    const genre  = [...new Set(results.flatMap((r) => r.genre  ?? []))].slice(0, 4);
    const styles = [...new Set(results.flatMap((r) => r.style  ?? []))].slice(0, 6);
    const labels = [...new Set(results.flatMap((r) => r.label  ?? []).map((l) => l.trim()))].slice(0, 5);

    return NextResponse.json({ genre, styles, labels });
  } catch {
    return NextResponse.json({ genre: [], styles: [], labels: [] });
  }
}
