"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { InlineStarRating } from "./InlineStarRating";
import { GifModal } from "./GifModal";
import { useAlbumStore } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { getEffectiveUserId } from "@/lib/identity";
import type { Album } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
function displayName(userId: string) { return UUID_RE.test(userId) ? "Anonymous" : userId; }

interface AlbumListCardProps {
  album: Album;
  allAlbums: Album[];
}

const FALLBACK_IMG = "/miles-davis.png";

export function AlbumListCard({ album, allAlbums }: AlbumListCardProps) {
  const [gifModalOpen, setGifModalOpen] = useState(false);
  const [artworkError, setArtworkError] = useState(false);
  const [showRaters, setShowRaters] = useState(false);
  const [raters, setRaters] = useState<{ userId: string; rating: number }[] | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rating = useAlbumStore((s) => s.ratings[album.id] ?? 0);

  const average       = useAveragesStore((s) => s.averages[album.id] ?? 0);
  const commentCount  = useAveragesStore((s) => s.commentCounts[album.id] ?? 0);
  const raterCount    = useAveragesStore((s) => s.raterCounts[album.id] ?? 0);
  const setAverage    = useAveragesStore((s) => s.setAverage);

  // Animate the score circle counting up/down to the community average
  const [displayAvg, setDisplayAvg] = useState(0);
  const animRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetAvg = Math.round(average); // integer for animation steps

  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (targetAvg === displayAvg) return;
    animRef.current = setInterval(() => {
      setDisplayAvg((prev) => {
        const diff = targetAvg - prev;
        const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 15));
        const next = prev + step;
        if ((step > 0 && next >= targetAvg) || (step < 0 && next <= targetAvg)) {
          clearInterval(animRef.current!);
          return targetAvg;
        }
        return next;
      });
    }, 24);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAvg]);

  // Submit the user's rating to the server whenever it changes (skip initial mount)
  const prevRating = useRef<number | null>(null);
  useEffect(() => {
    if (prevRating.current === null) { prevRating.current = rating; return; }
    if (prevRating.current === rating) return;
    prevRating.current = rating;

    const userId = getEffectiveUserId();
    if (!userId) return;
    fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, userId, rating }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.average === "number") setAverage(album.id, data.average);
        else setAverage(album.id, null);
      })
      .catch(() => {});
  }, [rating, album.id, setAverage]);

  // Close raters popover when clicking outside
  useEffect(() => {
    if (!showRaters) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setShowRaters(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRaters]);

  async function openRaters() {
    setShowRaters(true);
    if (raters !== null) return;
    const res = await fetch(`/api/album-ratings?albumId=${encodeURIComponent(album.id)}`);
    const data = await res.json();
    const list = Object.entries(data.ratings as Record<string, number>)
      .map(([userId, r]) => ({ userId, rating: r }))
      .sort((a, b) => b.rating - a.rating);
    setRaters(list);
  }

  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(
    `${album.title} Miles Davis`
  )}`;

  return (
    <>
      <div className="flex flex-col sm:flex-row group overflow-hidden rounded sm:rounded-none">
        {/* Album art — click opens comments modal */}
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
              onError={() => setArtworkError(true)}
            />
          ) : (
            <Image
              src={FALLBACK_IMG}
              alt="Miles Davis"
              fill
              className="object-cover object-top transition-opacity duration-200 group-hover:opacity-90"
              sizes="(max-width: 640px) 100vw, 38vw"
            />
          )}
        </button>

        {/* Content + action strip */}
        <div className="flex flex-1 min-w-0">

          {/* Content panel */}
          <div className="flex-1 bg-white flex flex-col justify-between p-5 min-w-0">
            <div>
              <p className="text-[#3a7cc5] font-bold text-sm tracking-wide">Miles Davis</p>
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[#3a7cc5] font-bold text-base sm:text-lg leading-snug mt-0.5 hover:underline"
              >
                {album.title}{album.year ? ` (${album.year})` : ""}
              </a>

              {/* Label tags */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {album.label && (
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-xs rounded">{album.label}</span>
                )}
                <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-xs rounded">Jazz</span>
                {album.year >= 1969 && album.year <= 1975 && (
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-xs rounded">Fusion</span>
                )}
                {album.year >= 1951 && album.year <= 1961 && (
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-xs rounded">Hard Bop</span>
                )}
              </div>

              {/* Description */}
              {album.description && (
                <p className="mt-3 text-zinc-500 text-xs leading-relaxed italic">
                  {album.description}
                </p>
              )}

              {/* Rating slider */}
              <div className="mt-4">
                <InlineStarRating albumId={album.id} />
              </div>
            </div>

            <p className="text-zinc-400 text-xs mt-3">
              Miles Takes Years
            </p>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              posted by <span className="text-zinc-400">Johnson</span>
            </p>
          </div>

          {/* Action strip */}
          <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center py-4 gap-4 bg-zinc-100 border-l border-zinc-200">
            {/* Community average */}
            <div
              className="flex flex-col items-center gap-1.5 relative"
              ref={popoverRef}
              onMouseEnter={openRaters}
              onMouseLeave={() => setShowRaters(false)}
            >
              <button
                onClick={openRaters}
                className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer hover:bg-zinc-800 transition-colors tabular-nums"
                title={raterCount > 0 ? `${raterCount} rating${raterCount !== 1 ? "s" : ""}` : "No ratings yet"}
              >
                {displayAvg > 0 ? displayAvg : "—"}
              </button>
              {raterCount > 0 && (
                <span className="text-[9px] text-zinc-500 leading-none">{raterCount}</span>
              )}
              <div className="w-8 h-1 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: rating > 0 ? `${rating}%` : "0%" }}
                />
              </div>

              {/* Raters popover */}
              {showRaters && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl py-2 text-left">
                  {raters === null ? (
                    <p className="px-3 py-1 text-zinc-600 text-xs">Loading…</p>
                  ) : raters.length === 0 ? (
                    <p className="px-3 py-1 text-zinc-600 text-xs">No ratings yet</p>
                  ) : (
                    raters.map(({ userId, rating: r }) => (
                      <div key={userId} className="flex items-center justify-between px-3 py-1">
                        <span className="text-zinc-300 text-xs truncate max-w-20">{displayName(userId)}</span>
                        <span className="text-amber-400 text-xs font-bold tabular-nums shrink-0">{r}</span>
                      </div>
                    ))
                  )}
                </div>
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
