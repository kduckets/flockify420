"use client";

import { useState } from "react";
import Image from "next/image";
import { GifModal } from "./GifModal";
import { useAlbumStore } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import type { Album } from "@/types";

const FALLBACK_IMG = "/miles-davis.png";

export function AlbumGridCard({ album, allAlbums }: { album: Album; allAlbums: Album[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [artErr, setArtErr] = useState(false);
  const rating       = useAlbumStore((s) => s.ratings[album.id] ?? 0);
  const average      = useAveragesStore((s) => s.averages[album.id] ?? 0);
  const commentCount = useAveragesStore((s) => s.commentCounts[album.id] ?? 0);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative aspect-square w-full overflow-hidden rounded bg-zinc-900 cursor-pointer group block"
        title={`${album.title} (${album.year})`}
      >
        <Image
          src={artErr || !album.artworkUrl ? FALLBACK_IMG : album.artworkUrl}
          alt={album.title}
          fill
          className="object-cover transition-opacity duration-150 group-hover:opacity-70"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          onError={() => setArtErr(true)}
        />

        {/* Bottom info strip — always visible */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/75 flex items-center justify-between px-1.5 py-1 gap-1">
          {/* Community average */}
          <div className="flex items-center gap-0.5 min-w-0">
            <span className="text-amber-400 text-[10px] leading-none">★</span>
            <span className="text-white text-[10px] font-semibold leading-none tabular-nums">
              {average > 0 ? Math.round(average) : "—"}
            </span>
          </div>

          {/* User rating bar — continuous fill */}
          <div className="flex-1 mx-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400/90 transition-all duration-300"
              style={{ width: rating > 0 ? `${rating}%` : "0%" }}
            />
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
          <p className="text-zinc-400 text-[10px]">
            {album.year || "—"}
            {album.type !== "studio" && <span className="ml-1 text-zinc-600 capitalize">{album.type}</span>}
          </p>
        </div>
      </button>

      {modalOpen && (
        <GifModal album={album} allAlbums={allAlbums} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
