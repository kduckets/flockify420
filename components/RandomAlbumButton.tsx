"use client";

import { useState } from "react";
import Image from "next/image";
import { GifModal } from "./GifModal";
import type { Album } from "@/types";

interface Props { albums: Album[] }

export function RandomAlbumButton({ albums }: Props) {
  const [picked, setPicked] = useState<Album | null>(null);

  function roll() {
    if (!albums.length) return;
    const pool = albums.filter((a) => a.artworkUrl);
    setPicked(pool[Math.floor(Math.random() * pool.length)]);
  }

  return (
    <>
      <button
        onClick={roll}
        className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
        aria-label="Random album"
        title="Roll for a random album"
      >
        <Image src="/dice.png" alt="Random album" width={20} height={20} className="opacity-50 hover:opacity-100 transition-opacity" />
      </button>

      {picked && (
        <GifModal album={picked} allAlbums={albums} onClose={() => setPicked(null)} />
      )}
    </>
  );
}
