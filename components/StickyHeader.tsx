"use client";

import { useEffect, useState } from "react";
import { ResetFeedButton } from "./ResetFeedButton";
import { RandomAlbumButton } from "./RandomAlbumButton";
import { FaotyButton } from "./FaotyButton";
import { LoginButton } from "./LoginButton";
import { MyPicksModal } from "./MyPicksModal";
import { useAuth } from "@/context/AuthContext";
import type { Album } from "@/types";

interface Props {
  albums: Album[];
}

export function StickyHeader({ albums }: Props) {
  const [scrolled, setScrolled]       = useState(false);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-5 border-b border-zinc-900 bg-black transition-[padding] duration-200 ${
        scrolled ? "py-1.5" : "py-3"
      }`}
    >
      <ResetFeedButton />
      <div />
      <div className="flex items-center gap-3 text-zinc-500">
        {user && (
          <button
            onClick={() => setShowMyPicks(true)}
            aria-label="My Picks"
            title="My Picks"
            className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        )}
        <a
          href="https://flockify-discographies.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discographies"
          title="Flockify Discographies"
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="18" rx="8.5" ry="2.5" />
            <ellipse cx="12" cy="14" rx="8.5" ry="2.5" />
            <ellipse cx="12" cy="10" rx="8.5" ry="2.5" />
            <circle cx="12" cy="10" r="1.3" stroke="none" fill="currentColor" />
          </svg>
        </a>
        <FaotyButton albums={albums} />
        <RandomAlbumButton albums={albums} />
        <LoginButton albumIds={albums.map((a) => a.id)} />
      </div>
    </header>

    {showMyPicks && (
      <MyPicksModal albums={albums} onClose={() => setShowMyPicks(false)} />
    )}
  </>
  );
}
