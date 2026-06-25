import { Feed } from "@/components/Feed";
import { UsernameButton } from "@/components/UsernameButton";
import { ResetFeedButton } from "@/components/ResetFeedButton";
import { RandomAlbumButton } from "@/components/RandomAlbumButton";
import { MILES_DAVIS_DISCOGRAPHY } from "@/data/milesDavisDiscography";
import type { Batch } from "@/types";

const LASTFM_KEY = "5f3f26020d42b6c407e571e17c6e493f";

function normalizeTitle(t: string) {
  return t
    .toLowerCase()
    .replace(/\s*[\(\[](remaster|deluxe|anniversary|edition|version|expanded|reissue|bonus)[^\)\]]*[\)\]]\s*/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// More aggressive normalization for matching descriptions by title + year
function normalizeForDesc(t: string) {
  return t
    .toLowerCase()
    .replace(/\bvol(ume)?\.?\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DescEntry = { notes: string; order: number };

async function fetchDescriptions(): Promise<Map<string, DescEntry>> {
  const map = new Map<string, DescEntry>();
  try {
    const res = await fetch("https://cmurray1221.github.io/posts.json", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return map;
    const posts: Array<{ title: string; year: number; notes: string }> = await res.json();
    posts.forEach((post, i) => {
      const key = `${post.year}-${normalizeForDesc(post.title)}`;
      const notes = post.notes.replace(/^-\s*/, "").trim();
      map.set(key, { notes, order: i });
    });
  } catch { /* fall through */ }
  return map;
}

// Fuzzy description lookup: exact → prefix → space-collapsed substring
function findDesc(descMap: Map<string, DescEntry>, year: number, title: string): DescEntry | undefined {
  const norm = normalizeForDesc(title);
  const exact = descMap.get(`${year}-${norm}`);
  if (exact) return exact;
  const normNoSpaces = norm.replace(/ /g, "");
  for (const [key, entry] of descMap) {
    const dash = key.indexOf("-");
    if (parseInt(key.slice(0, dash)) !== year) continue;
    const keyTitle = key.slice(dash + 1);
    if (keyTitle.startsWith(norm)) return entry;
    if (normNoSpaces.length >= 5 && keyTitle.replace(/ /g, "").includes(normNoSpaces)) return entry;
  }
  return undefined;
}

async function fetchItunesArtwork(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(
      "https://itunes.apple.com/search?term=miles+davis&entity=album&attribute=artistTerm&limit=200&country=us"
    );
    if (!res.ok) return map;
    const data = await res.json();
    for (const item of data.results) {
      if (item.artistName?.toLowerCase() !== "miles davis") continue;
      const key = normalizeTitle(item.collectionName ?? "");
      if (key && item.artworkUrl100) {
        map.set(key, item.artworkUrl100.replace("100x100bb", "600x600bb"));
      }
    }
  } catch {
    // fall through — all albums will use Last.fm or photo fallback
  }
  return map;
}

async function fetchLastFmImage(title: string): Promise<string> {
  try {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=album.getinfo` +
      `&artist=Miles+Davis&album=${encodeURIComponent(title)}` +
      `&api_key=${LASTFM_KEY}&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return "";
    const data = await res.json();
    const images: Array<{ "#text": string; size: string }> = data.album?.image ?? [];
    for (const size of ["extralarge", "mega", "large"]) {
      const img = images.find((i) => i.size === size);
      if (img?.["#text"]) return img["#text"];
    }
  } catch {
    // fall through
  }
  return "";
}

export default async function Home() {
  const [artworkMap, descMap] = await Promise.all([
    fetchItunesArtwork(),
    fetchDescriptions(),
  ]);

  const studioAlbums = MILES_DAVIS_DISCOGRAPHY.filter((e) => e.type === "studio");

  // Fetch Last.fm in parallel for studios missing from iTunes
  const missingAlbums = studioAlbums.filter((e) => !artworkMap.has(normalizeTitle(e.title)));
  const lastFmResults = await Promise.all(
    missingAlbums.map(async (e) => ({ title: e.title, url: await fetchLastFmImage(e.title) }))
  );
  const lastFmMap = new Map(lastFmResults.filter((r) => r.url).map((r) => [r.title, r.url]));

  // Studio albums (Classic view) — IDs are stable: md-{studio-index}
  const albums = studioAlbums.map((entry, i) => {
    const desc = findDesc(descMap, entry.year, entry.title);
    return {
      id: `md-${i}`,
      title: entry.title,
      year: entry.year,
      batchId: "miles-davis",
      artworkUrl: artworkMap.get(normalizeTitle(entry.title)) ?? lastFmMap.get(entry.title) ?? "",
      label: entry.label,
      type: entry.type,
      description: desc?.notes,
      postOrder: desc?.order,
    };
  });

  // Stable ID map so studio albums share IDs in both views
  const studioIdMap = new Map(albums.map((a) => [a.title, a.id]));

  // Full discography (Grid view) — uses same IDs for studio, new IDs for live/compilation
  const allDiscography = MILES_DAVIS_DISCOGRAPHY.map((entry, i) => {
    const desc = findDesc(descMap, entry.year, entry.title);
    return {
      id: studioIdMap.get(entry.title) ?? `mdx-${i}`,
      title: entry.title,
      year: entry.year,
      batchId: "miles-davis",
      artworkUrl: artworkMap.get(normalizeTitle(entry.title)) ?? "",
      label: entry.label,
      type: entry.type,
      description: desc?.notes,
      postOrder: desc?.order,
    };
  });

  const batches: Batch[] = [
    {
      id: "miles-davis",
      name: "Miles Takes Years",
      description:
        "The complete discography of Miles Davis — studio albums, live recordings, and compilations.",
      albums,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
        <ResetFeedButton />

        <div />

        <div className="flex items-center gap-3 text-zinc-500">
          <RandomAlbumButton albums={albums.filter((a) => !!a.description)} />
          <UsernameButton albumIds={albums.map((a) => a.id)} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        <Feed batches={batches} allDiscography={allDiscography} />
      </main>
    </div>
  );
}
