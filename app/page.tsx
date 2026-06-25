import { Feed } from "@/components/Feed";
import { UsernameButton } from "@/components/UsernameButton";
import { ResetFeedButton } from "@/components/ResetFeedButton";
import { RandomAlbumButton } from "@/components/RandomAlbumButton";
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
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
        <ResetFeedButton />
        <div />
        <div className="flex items-center gap-3 text-zinc-500">
          <RandomAlbumButton albums={albums} />
          <UsernameButton albumIds={albums.map((a) => a.id)} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        <Feed albums={albums} />
      </main>
    </div>
  );
}
