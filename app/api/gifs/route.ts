import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.TENOR_API_KEY ?? "LIVDSRZULELA";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ gifs: [] });

  try {
    const url =
      `https://api.tenor.com/v1/search` +
      `?key=${KEY}&q=${encodeURIComponent(q)}&limit=20&contentfilter=medium&media_filter=minimal`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ gifs: [] });
    const data = await res.json();

    type TenorMedia = { url: string; dims: number[] };
    type TenorItem = { id: string; title: string; media: Array<Record<string, TenorMedia>> };

    const gifs = (data.results as TenorItem[]).flatMap((item) => {
      const media = item.media[0];
      const url     = media?.gif?.url ?? "";
      const preview = media?.tinygif?.url ?? url;
      return url ? [{ id: item.id, title: item.title, url, preview }] : [];
    });

    return NextResponse.json({ gifs });
  } catch {
    return NextResponse.json({ gifs: [] });
  }
}
