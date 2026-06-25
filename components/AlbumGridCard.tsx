"use client";

import { useState } from "react";
import Image from "next/image";
import { GifModal } from "./GifModal";
import { useAlbumStore, type VoteValue } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import type { Album } from "@/types";

export function AlbumGridCard({ album, allAlbums }: { album: Album; allAlbums: Album[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [artErr, setArtErr] = useState(false);
  const vote         = (useAlbumStore((s) => s.votes[album.id]) ?? 0) as VoteValue | 0;
  const score        = useAveragesStore((s) => s.scores[album.id] ?? 0);
  const voterCount   = useAveragesStore((s) => s.voterCounts[album.id] ?? 0);
  const commentCount = useAveragesStore((s) => s.commentCounts[album.id] ?? 0);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative aspect-square w-full overflow-hidden rounded bg-zinc-900 cursor-pointer group block"
        title={`${album.artist} – ${album.title}${album.year ? ` (${album.year})` : ""}`}
      >
        <Image
          src={artErr || !album.artworkUrl ? "/flockify.png" : album.artworkUrl}
          alt={album.title}
          fill
          className="object-cover transition-opacity duration-150 group-hover:opacity-70"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          unoptimized
          onError={() => setArtErr(true)}
        />

        {/* Bottom info strip */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/75 flex items-center justify-between px-1.5 py-1 gap-1">
          {/* Community score */}
          <div className="flex items-center gap-0.5 min-w-0">
            <span className={`text-[10px] font-bold leading-none tabular-nums ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-zinc-500"}`}>
              {voterCount > 0 ? (score >= 0 ? `+${score}` : String(score)) : "—"}
            </span>
          </div>

          {/* User vote indicator */}
          <div className="flex-1 mx-1 flex justify-center">
            {vote !== 0 && (
              <span className={`text-[10px] font-bold leading-none ${vote === 2 ? "text-amber-400" : vote === 1 ? "text-green-400" : "text-red-400"}`}>
                {vote === 2 ? "★" : vote === 1 ? "▲" : "▼"}
              </span>
            )}
          </div>

          {/* Comment count */}
          <div className="flex items-center gap-0.5">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-zinc-300 text-[10px] font-medium leading-none">
              {commentCount > 0 ? commentCount : "0"}
            </span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
          <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2">{album.title}</p>
          <p className="text-zinc-400 text-[10px]">{album.artist}</p>
        </div>
      </button>

      {modalOpen && (
        <GifModal album={album} allAlbums={allAlbums} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
