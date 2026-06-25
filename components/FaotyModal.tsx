"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAlbumStore, type VoteValue } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { useUIStore } from "@/store/uiStore";
import { useAuth } from "@/context/AuthContext";
import type { Album } from "@/types";

const WINNERS: Record<number, { artist: string; title: string } | null> = {
  2016: { artist: "Radiohead", title: "A Moon Shaped Pool" },
  2017: { artist: "Kendrick Lamar", title: "Damn" },
  2018: { artist: "Ty Segall", title: "Freedom's Goblin" },
  2019: null,
  2020: { artist: "Fiona Apple", title: "Fetch The Bolt Cutters" },
  2021: { artist: "Floating Points / Pharoah Sanders", title: "Promises" },
  2022: { artist: "Black Country, New Road", title: "Ants From Up There" },
  2023: { artist: "OSEES", title: "Intercepted Message" },
  2025: { artist: "Geese", title: "Getting Killed" },
};

function getFaotyYear(album: Album): number | null {
  for (const t of album.tags) {
    const lower = t.toLowerCase().replace(/\s/g, "");
    const m = lower.match(/faoty(\d{4})/);
    if (m) return parseInt(m[1]);
    if (lower === "faoty21") return 2021;
    if (lower === "faoty22") return 2022;
    if (lower === "faoty23") return 2023;
    if (lower === "faoty24") return 2024;
    if (lower === "faoty25") return 2025;
  }
  if (album.year >= 2016) return album.year;
  const postYear = new Date(album.createdTs).getFullYear();
  return postYear >= 2016 ? postYear : null;
}

function isNominee(album: Album) {
  return album.tags.some((t) => t.toLowerCase().replace(/\s/g, "").startsWith("faoty"));
}

function isWinner(album: Album, year: number): boolean {
  const w = WINNERS[year];
  if (!w) return false;
  return (
    album.title.toLowerCase().includes(w.title.toLowerCase()) &&
    album.artist.toLowerCase().replace(/\//g, "").includes(w.artist.split("/")[0].trim().toLowerCase())
  );
}

interface NomineeCardProps {
  album: Album;
  year: number;
}

function NomineeCard({ album, year }: NomineeCardProps) {
  const { user } = useAuth();
  const vote        = (useAlbumStore((s) => s.votes[album.id]) ?? 0) as VoteValue | 0;
  const setVote     = useAlbumStore((s) => s.setVote);
  const score       = useAveragesStore((s) => s.scores[album.id] ?? album.legacyScore);
  const voterCount  = useAveragesStore((s) => s.voterCounts[album.id] ?? 0);
  const setScore    = useAveragesStore((s) => s.setScore);
  const setVoterCount = useAveragesStore((s) => s.setVoterCount);
  const openSignInModal = useUIStore((s) => s.openSignInModal);
  const winner = isWinner(album, year);
  const displayScore = voterCount > 0 ? score : album.legacyScore;

  async function handleVote(newVote: VoteValue) {
    if (!user) { openSignInModal(); return; }
    if (album.userId && user.uid === album.userId) return;
    const next: VoteValue | 0 = vote === newVote ? 0 : newVote;
    setVote(album.id, next);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id, userId: user.uid, vote: next }),
      });
      const data = await res.json();
      if (typeof data.score === "number") setScore(album.id, data.score);
      if (typeof data.voterCount === "number") setVoterCount(album.id, data.voterCount);
    } catch { /* silent */ }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${winner ? "bg-amber-950/40 border border-amber-700/40" : "bg-zinc-900/60"}`}>
      {/* Artwork */}
      <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-800">
        {album.artworkUrl && (
          <Image src={album.artworkUrl} alt={album.title} fill className="object-cover" sizes="48px" unoptimized />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-tight truncate">{album.title}</p>
        <p className="text-zinc-400 text-xs truncate">{album.artist}</p>
        {winner && (
          <p className="text-amber-400 text-[10px] font-semibold mt-0.5">🏆 Winner</p>
        )}
      </div>

      {/* Score + votes */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-zinc-300 text-sm font-bold tabular-nums w-6 text-center">
          {displayScore > 0 ? displayScore : displayScore < 0 ? displayScore : 0}
        </span>
        <button
          onClick={() => handleVote(1)}
          title="Upvote"
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            vote === 1 ? "bg-green-900/60 text-green-400 border border-green-700" : "bg-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </button>
        <button
          onClick={() => handleVote(2)}
          title="Star (+2)"
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            vote === 2 ? "bg-amber-900/60 text-amber-400 border border-amber-700" : "bg-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={vote === 2 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button
          onClick={() => handleVote(-1)}
          title="Downvote"
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            vote === -1 ? "bg-red-900/60 text-red-400 border border-red-700" : "bg-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
}

interface Props {
  albums: Album[];
  onClose: () => void;
}

export function FaotyModal({ albums, onClose }: Props) {
  const dynamicAlbums = useAlbumStore((s) => s.dynamicAlbums);
  const fetchScores   = useAveragesStore((s) => s.fetchScores);

  const allAlbums = [...dynamicAlbums, ...albums];
  const nominees  = allAlbums.filter(isNominee);

  const byYear: Record<number, Album[]> = {};
  for (const a of nominees) {
    const yr = getFaotyYear(a);
    if (yr) {
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(a);
    }
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(years[0] ?? 2024);

  useEffect(() => {
    if (nominees.length) fetchScores(nominees.map((a) => a.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const scores = useAveragesStore((s) => s.scores);
  const yearNominees = [...(byYear[selectedYear] ?? [])].sort((a, b) => {
    if (isWinner(b, selectedYear)) return 1;
    if (isWinner(a, selectedYear)) return -1;
    return (scores[b.id] ?? b.legacyScore) - (scores[a.id] ?? a.legacyScore);
  });

  const allWinnerYears = Object.keys(WINNERS).map(Number).sort((a, b) => b - a);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">FAOTY</h2>
              <p className="text-zinc-500 text-[11px]">Flockify Album of the Year</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Year tabs */}
          <div className="flex gap-1.5 px-5 pt-4 pb-3 overflow-x-auto">
            {years.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedYear === yr ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Nominees for selected year */}
          <div className="px-5 pb-4">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">
              {WINNERS[selectedYear] !== undefined ? `${selectedYear} Nominees` : `${selectedYear} Nominees — voting open`}
            </p>
            {yearNominees.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4">No nominees tagged for this year yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {yearNominees.map((album) => (
                  <NomineeCard key={album.id} album={album} year={selectedYear} />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 mx-5" />

          {/* Hall of Fame */}
          <div className="px-5 py-4">
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">Hall of Fame</p>
            <div className="flex flex-col gap-1.5">
              {allWinnerYears.map((yr) => {
                const w = WINNERS[yr];
                return (
                  <div key={yr} className="flex items-baseline gap-2">
                    <span className="text-zinc-600 text-xs w-8 shrink-0">{yr}</span>
                    {w ? (
                      <span className="text-zinc-300 text-sm">
                        {w.artist} <span className="text-zinc-500 italic">— {w.title}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-sm italic">FAOTD — votes still under review</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
