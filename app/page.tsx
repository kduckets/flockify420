import { Feed } from "@/components/Feed";
import { StickyHeader } from "@/components/StickyHeader";
import { FLOCKIFY_POSTS } from "@/data/flockifyPosts";
import type { Album } from "@/types";

export default function Home() {
  const albums: Album[] = FLOCKIFY_POSTS.map((p, i) => ({
    id: p.id,
    title: p.album,
    artist: p.artist,
    year: parseInt(p.releaseDate) || 0,
    artworkUrl: p.artworkUrl,
    spotifyUri: p.spotifyUri,
    description: p.summary || undefined,
    labels: p.labels,
    genre: p.genre,
    tags: p.tags,
    creatorName: p.creatorName,
    createdTs: p.createdTs,
    postOrder: new Date(p.createdTs).getTime() || i,
    legacyScore: p.score,
    legacyStars: p.stars,
  }));

  return (
    <div className="min-h-screen bg-black">
      <StickyHeader albums={albums} />

      <main className="max-w-3xl mx-auto">
        <Feed albums={albums} />
      </main>
    </div>
  );
}
