"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { GifModal } from "./GifModal";
import { useAlbumStore, type VoteValue } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { useAuth } from "@/context/AuthContext";
import { uidToUsername } from "@/data/uidToUsername";
import type { Album } from "@/types";

function displayName(userId: string) {
  return uidToUsername[userId] ?? userId;
}

interface AlbumListCardProps {
  album: Album;
  allAlbums: Album[];
  onDelete?: () => void;
}

export function AlbumListCard({ album, allAlbums, onDelete }: AlbumListCardProps) {
  const [gifModalOpen, setGifModalOpen] = useState(false);
  const [artworkError, setArtworkError] = useState(false);
  const [showVoters, setShowVoters]     = useState(false);
  const [voters, setVoters]             = useState<{ userId: string; vote: number }[] | null>(null);
  const [nudge, setNudge]               = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const vote    = (useAlbumStore((s) => s.votes[album.id]) ?? 0) as VoteValue | 0;
  const setVote = useAlbumStore((s) => s.setVote);

  const score       = useAveragesStore((s) => s.scores[album.id] ?? 0);
  const voterCount  = useAveragesStore((s) => s.voterCounts[album.id] ?? 0);
  const commentCount = useAveragesStore((s) => s.commentCounts[album.id] ?? 0);
  const setScore      = useAveragesStore((s) => s.setScore);
  const setVoterCount = useAveragesStore((s) => s.setVoterCount);

  const [displayScore, setDisplayScore] = useState(0);
  const animRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetScore = voterCount > 0 ? score : album.legacyScore;

  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (targetScore === displayScore) return;
    animRef.current = setInterval(() => {
      setDisplayScore((prev) => {
        const diff = targetScore - prev;
        const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 10));
        const next = prev + step;
        if ((step > 0 && next >= targetScore) || (step < 0 && next <= targetScore)) {
          clearInterval(animRef.current!);
          return targetScore;
        }
        return next;
      });
    }, 30);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore]);

  // Close voters popover when clicking outside
  useEffect(() => {
    if (!showVoters) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setShowVoters(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showVoters]);

  async function openVoters() {
    setShowVoters(true);
    if (voters !== null) return;
    const res = await fetch(`/api/album-ratings?albumId=${encodeURIComponent(album.id)}`);
    const data = await res.json();
    const list = Object.entries(data.ratings as Record<string, number>)
      .map(([userId, v]) => ({ userId, vote: v }))
      .sort((a, b) => b.vote - a.vote);
    setVoters(list);
  }

  async function handleVote(newVote: VoteValue) {
    if (!user) {
      setNudge(true);
      setTimeout(() => setNudge(false), 2500);
      return;
    }
    const userId = user.uid;
    const next: VoteValue | 0 = vote === newVote ? 0 : newVote;
    setVote(album.id, next);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id, userId, vote: next }),
      });
      const data = await res.json();
      if (typeof data.score === "number") setScore(album.id, data.score);
      if (typeof data.voterCount === "number") setVoterCount(album.id, data.voterCount);
    } catch { /* silent */ }
  }

  const voteLabel = (v: number) => v === 2 ? "★" : v === 1 ? "+1" : v === -1 ? "−1" : "—";

  const spotifyUrl = album.spotifyUri || `https://open.spotify.com/search/${encodeURIComponent(`${album.title} ${album.artist}`)}`;

  return (
    <>
      <div className="flex flex-col sm:flex-row group overflow-hidden rounded sm:rounded-none">
        {/* Album art */}
        <button
          onClick={() => setGifModalOpen(true)}
          className="relative w-full aspect-square sm:aspect-auto sm:w-[38%] sm:min-h-60 shrink-0 overflow-hidden block cursor-pointer"
          aria-label={`Open comments for ${album.title}`}
        >
          {album.artworkUrl && !artworkError ? (
            <Image
              src={album.artworkUrl}
              alt={album.title}
              fill
              className="object-cover transition-opacity duration-200 group-hover:opacity-90"
              sizes="(max-width: 640px) 100vw, 38vw"
              unoptimized
              onError={() => setArtworkError(true)}
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-zinc-700 text-4xl">♪</span>
            </div>
          )}
        </button>

        {/* Content + action strip */}
        <div className="flex flex-1 min-w-0">

          {/* Content panel */}
          <div className="flex-1 bg-white flex flex-col justify-between p-5 min-w-0">
            <div>
              <p className="text-[#3a7cc5] font-bold text-sm tracking-wide">{album.artist}</p>
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[#3a7cc5] font-bold text-base sm:text-lg leading-snug mt-0.5 hover:underline"
              >
                {album.title}{album.year ? ` (${album.year})` : ""}
              </a>

              {/* Legacy stars */}
              {album.legacyStars > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: album.legacyStars }).map((_, i) => (
                    <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
              )}

              {/* Genre / tags */}
              {album.genre.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {album.genre.slice(0, 2).map((g) => (
                    <span key={g} className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-xs rounded">{g}</span>
                  ))}
                </div>
              )}

              {/* Label — shown separately */}
              {album.labels[0] && (
                <p className="text-zinc-400 text-[11px] mt-1">{album.labels[0]}</p>
              )}

              {/* Description */}
              {album.description && (
                <p className="mt-3 text-zinc-500 text-sm leading-relaxed italic">
                  {album.description}
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-zinc-500 text-[11px]">
                posted by <span className="text-zinc-400">{album.creatorName || "unknown"}</span>
              </p>
              {onDelete && album.userId && user?.uid === album.userId && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm("Remove this post?")) return;
                    setDeleting(true);
                    try {
                      await fetch("/api/delete-post", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: album.id, userId: user.uid }),
                      });
                      onDelete();
                    } catch { /* silent */ }
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  className="text-zinc-600 hover:text-red-400 text-[11px] transition-colors cursor-pointer disabled:opacity-40"
                >
                  {deleting ? "removing…" : "remove"}
                </button>
              )}
            </div>
          </div>

          {/* Action strip */}
          <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center py-4 gap-4 bg-zinc-100 border-l border-zinc-200">
            {/* Community score */}
            <div
              className="flex flex-col items-center gap-1.5 relative"
              ref={popoverRef}
              onMouseEnter={openVoters}
              onMouseLeave={() => setShowVoters(false)}
            >
              <button
                onClick={openVoters}
                className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer hover:bg-zinc-800 transition-colors tabular-nums"
                title={voterCount > 0 ? `Score: ${score} · ${voterCount} voter${voterCount !== 1 ? "s" : ""}` : `Legacy score: ${album.legacyScore}`}
              >
                {displayScore >= 0 ? `+${displayScore}` : String(displayScore)}
              </button>
              {voterCount > 0 && (
                <span className="text-[9px] text-zinc-500 leading-none">{voterCount}</span>
              )}
              {vote !== 0 && (
                <span className={`text-[9px] leading-none font-bold ${vote === 2 ? "text-amber-500" : vote === 1 ? "text-green-600" : "text-red-500"}`}>
                  {voteLabel(vote)}
                </span>
              )}

              {/* Voters popover */}
              {showVoters && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl py-2 text-left">
                  {voters === null ? (
                    <p className="px-3 py-1 text-zinc-600 text-xs">Loading…</p>
                  ) : voters.length === 0 ? (
                    <p className="px-3 py-1 text-zinc-600 text-xs">No votes yet</p>
                  ) : (
                    voters.map(({ userId, vote: v }) => (
                      <div key={userId} className="flex items-center justify-between px-3 py-1">
                        <span className="text-zinc-300 text-xs truncate max-w-20">{displayName(userId)}</span>
                        <span className={`text-xs font-bold tabular-nums shrink-0 ${v === 2 ? "text-amber-400" : v === 1 ? "text-green-400" : "text-red-400"}`}>
                          {v === 2 ? "★" : v === 1 ? "▲" : "▼"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Vote buttons */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => handleVote(1)}
                title="Upvote (+1)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer ${
                  vote === 1 ? "bg-green-100 text-green-700 border border-green-300" : "bg-zinc-200 text-zinc-500 hover:text-zinc-700 border border-zinc-300"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button
                onClick={() => handleVote(2)}
                title="Star (+2)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer ${
                  vote === 2 ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-zinc-200 text-zinc-500 hover:text-zinc-700 border border-zinc-300"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={vote === 2 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
              <button
                onClick={() => handleVote(-1)}
                title="Downvote (−1)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer ${
                  vote === -1 ? "bg-red-100 text-red-600 border border-red-300" : "bg-zinc-200 text-zinc-500 hover:text-zinc-700 border border-zinc-300"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {nudge && (
                <span className="text-zinc-500 text-[8px] leading-tight text-center">sign in</span>
              )}
            </div>

            {/* GIF comments */}
            <button
              onClick={() => setGifModalOpen(true)}
              className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              aria-label={`${commentCount} GIF reactions`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {commentCount > 0 && (
                <span className="text-[10px] text-zinc-500 font-medium">{commentCount}</span>
              )}
            </button>
          </div>

        </div>
      </div>

      {gifModalOpen && (
        <GifModal album={album} allAlbums={allAlbums} onClose={() => setGifModalOpen(false)} />
      )}
    </>
  );
}
