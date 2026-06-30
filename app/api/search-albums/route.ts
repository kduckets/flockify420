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

interface DeezerAlbum {
  id: number;
  title: string;
  record_type: string;
  release_date?: string;
  cover_xl?: string;
  cover_big?: string;
  cover_medium?: string;
  artist: { name: string };
}

interface SearchResult {
  id: string;
  album: string;
  artist: string;
  artworkUrl: string;
  releaseDate: string;
  genre: string[];
}

function dedupeKey(artist: string, album: string) {
  return `${artist.toLowerCase().replace(/\W/g, "")}::${album.toLowerCase().replace(/\W/g, "")}`;
}

async function searchItunes(q: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&media=music&limit=25`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? [])
      .filter((r: ItunesResult) => r.collectionType === "Album")
      .map((r: ItunesResult) => ({
        id: `it_${r.collectionId}`,
        album: r.collectionName,
        artist: r.artistName,
        artworkUrl: (r.artworkUrl100 ?? "").replace("100x100bb", "600x600bb"),
        releaseDate: r.releaseDate ? r.releaseDate.slice(0, 4) : "",
        genre: r.primaryGenreName ? [r.primaryGenreName] : [],
      }));
  } catch { return []; }
}

async function searchDeezer(q: string): Promise<SearchResult[]> {
  try {
    const [general, artist] = await Promise.all([
      fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=25`, { next: { revalidate: 60 } })
        .then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`https://api.deezer.com/search/album?q=artist:"${encodeURIComponent(q)}"&limit=25`, { next: { revalidate: 60 } })
        .then((r) => r.json()).catch(() => ({ data: [] })),
    ]);

    const seen = new Set<number>();
    const allowed = new Set(["album", "ep"]);
    const combined: DeezerAlbum[] = [];
    for (const r of [...(general.data ?? []), ...(artist.data ?? [])]) {
      if (!seen.has(r.id) && allowed.has(r.record_type)) {
        seen.add(r.id);
        combined.push(r);
      }
    }

    return combined.map((r) => ({
      id: `dz_${r.id}`,
      album: r.title,
      artist: r.artist.name,
      artworkUrl: r.cover_xl ?? r.cover_big ?? r.cover_medium ?? "",
      releaseDate: r.release_date ? r.release_date.slice(0, 4) : "",
      genre: [],
    }));
  } catch { return []; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [itunesResults, deezerResults] = await Promise.all([
    searchItunes(q),
    searchDeezer(q),
  ]);

  // Merge: iTunes first (has genres), then Deezer for anything not already covered
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of [...itunesResults, ...deezerResults]) {
    const key = dedupeKey(r.artist, r.album);
    if (!seen.has(key)) { seen.add(key); merged.push(r); }
  }

  return NextResponse.json({ results: merged });
}
