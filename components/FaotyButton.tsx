"use client";

import { useState } from "react";
import Image from "next/image";
import { FaotyModal, WINNERS } from "./FaotyModal";
import type { Album } from "@/types";

const LATEST_WINNER_YEAR = Math.max(...Object.keys(WINNERS).map(Number));

export function FaotyButton({ albums }: { albums: Album[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="FAOTY — Flockify Album of the Year"
        title="FAOTY — Flockify Album of the Year"
        className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-zinc-500"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/>
          <path d="M6 4h12v10a6 6 0 0 1-6 6 6 6 0 0 1-6-6V4Z"/>
          <path d="M9 20h6"/>
          <path d="M12 20v2"/>
        </svg>
      </button>
      {open && <FaotyModal albums={albums} onClose={() => setOpen(false)} />}
    </>
  );
}

export function FaotyBanner({ albums }: { albums: Album[] }) {
  const [open, setOpen] = useState(false);

  const winner = WINNERS[LATEST_WINNER_YEAR];
  if (!winner) return null;

  const winnerAlbum = albums.find(
    (a) =>
      a.title.toLowerCase().includes(winner.title.toLowerCase()) &&
      a.artist.toLowerCase().includes(winner.artist.split("/")[0].trim().toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 px-5 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors cursor-pointer text-left group"
        aria-label={`${LATEST_WINNER_YEAR} FAOTY Winner: ${winner.artist} — ${winner.title}`}
      >
        {/* Album art */}
        <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-zinc-800">
          {winnerAlbum?.artworkUrl && (
            <Image
              src={winnerAlbum.artworkUrl}
              alt={winner.title}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
            🏆 {LATEST_WINNER_YEAR} FAOTY Winner
          </p>
          <p className="text-white font-semibold text-sm leading-tight truncate">{winner.title}</p>
          <p className="text-zinc-400 text-xs truncate">{winner.artist}</p>
        </div>

        <svg className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>

      {open && <FaotyModal albums={albums} onClose={() => setOpen(false)} />}
    </>
  );
}
