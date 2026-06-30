"use client";

import { useMemo, useState, useEffect } from "react";
import { useAlbumStore } from "@/store/albumStore";
import { useAuth } from "@/context/AuthContext";
import { getFlockifyUsername } from "@/data/uidToUsername";
import { GifModal } from "./GifModal";
import type { Album } from "@/types";

type Tab = "starred" | "upvoted" | "saved" | "posted";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "starred",  label: "Starred",  icon: "★" },
  { id: "upvoted",  label: "Upvoted",  icon: "↑" },
  { id: "saved",    label: "Saved",    icon: "♥" },
  { id: "posted",   label: "Posted",   icon: "+" },
];

interface Props {
  albums: Album[];
  onClose: () => void;
}

export function MyPicksModal({ albums, onClose }: Props) {
  const [tab, setTab]               = useState<Tab>("starred");
  const [filter, setFilter]         = useState<string | null>(null);
  const [sortMode, setSortMode]     = useState<"new" | "alpha">("new");
  const [gifAlbum, setGifAlbum]     = useState<Album | null>(null);

  const { user } = useAuth();
  const votes           = useAlbumStore((s) => s.votes);
  const favoritedAlbums = useAlbumStore((s) => s.favoritedAlbums);
  const dynamicAlbums   = useAlbumStore((s) => s.dynamicAlbums);

  const allAlbums = useMemo(() => [...dynamicAlbums, ...albums], [dynamicAlbums, albums]);

  const flockifyName = user ? getFlockifyUsername(user.uid) : null;

  // Albums for each tab
  const tabAlbums = useMemo(() => {
    if (tab === "posted") {
      return allAlbums.filter((a) =>
        (a.userId && a.userId === user?.uid) ||
        (flockifyName && a.creatorName && a.creatorName.toLowerCase() === flockifyName.toLowerCase())
      );
    }
    let ids: string[];
    if (tab === "starred")      ids = Object.entries(votes).filter(([, v]) => v === 2).map(([id]) => id);
    else if (tab === "upvoted") ids = Object.entries(votes).filter(([, v]) => v === 1).map(([id]) => id);
    else                        ids = [...favoritedAlbums];
    return allAlbums.filter((a) => ids.includes(a.id));
  }, [tab, votes, favoritedAlbums, allAlbums, user?.uid, flockifyName]);

  // Clear filter when tab changes
  useEffect(() => setFilter(null), [tab]);

  // Genre+tag chips sorted by frequency (most albums first)
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of tabAlbums) {
      for (const chip of [...a.genre, ...a.tags]) {
        if (chip) counts.set(chip, (counts.get(chip) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([chip]) => chip);
  }, [tabAlbums]);

  // Filter + sort
  const displayed = useMemo(() => {
    const base = filter
      ? tabAlbums.filter((a) => a.genre.includes(filter) || a.tags.includes(filter))
      : tabAlbums;
    return [...base].sort((a, b) =>
      sortMode === "alpha"
        ? a.artist.localeCompare(b.artist)
        : (b.postOrder ?? 0) - (a.postOrder ?? 0)
    );
  }, [tabAlbums, filter, sortMode]);

  // Counts per tab
  const counts: Record<Tab, number> = useMemo(() => ({
    starred:  Object.values(votes).filter((v) => v === 2).length,
    upvoted:  Object.values(votes).filter((v) => v === 1).length,
    saved:    favoritedAlbums.length,
    posted:   allAlbums.filter((a) =>
      (a.userId && a.userId === user?.uid) ||
      (flockifyName && a.creatorName && a.creatorName.toLowerCase() === flockifyName.toLowerCase())
    ).length,
  }), [votes, favoritedAlbums, allAlbums, user?.uid, flockifyName]);

  return (
    <>
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 flex flex-col h-full max-w-xl w-full mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
          <h2 className="text-sm font-semibold tracking-wide">My Picks</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-900">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-xs tracking-widest font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === id ? "text-white border-b-2 border-white -mb-px" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span className="text-[13px] leading-none">{icon}</span>
              {label}
              {counts[id] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === id ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-600"
                }`}>{counts[id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Genre/tag chips + sort */}
        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-zinc-900 overflow-x-auto" style={{ touchAction: "pan-x" }}>
            <button
              onClick={() => setFilter(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                filter === null ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-300"
              }`}
            >ALL</button>
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => setFilter(filter === chip ? null : chip)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                  filter === chip ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >{chip}</button>
            ))}
            <div className="shrink-0 ml-auto pl-2">
              <button
                onClick={() => setSortMode(sortMode === "new" ? "alpha" : "new")}
                className="text-zinc-600 hover:text-zinc-400 text-[10px] tracking-widest transition-colors cursor-pointer whitespace-nowrap"
              >{sortMode === "new" ? "A–Z" : "NEW"}</button>
            </div>
          </div>
        )}

        {/* Album list */}
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-700">
              <span className="text-3xl">{TABS.find((t) => t.id === tab)?.icon}</span>
              <span className="text-xs tracking-wide">
                {filter ? "No albums match this filter." : `Nothing ${tab} yet.`}
              </span>
            </div>
          ) : (
            <ul>
              {displayed.map((album) => (
                <li
                  key={album.id}
                  onClick={() => setGifAlbum(album)}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                >
                  {/* Artwork */}
                  {album.artworkUrl ? (
                    <img
                      src={album.artworkUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-zinc-800 shrink-0" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate leading-tight">{album.artist}</div>
                    <div className="text-xs text-zinc-400 truncate leading-tight">{album.title}</div>
                    {(album.genre.length > 0 || album.tags.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...album.genre, ...album.tags].slice(0, 4).map((g) => (
                          <button
                            key={g}
                            onClick={(e) => { e.stopPropagation(); setFilter(filter === g ? null : g); }}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              filter === g
                                ? "bg-white text-black"
                                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >{g}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Year + vote badge */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {album.year > 0 && (
                      <span className="text-[11px] text-zinc-600">{album.year}</span>
                    )}
                    {votes[album.id] === 2 && (
                      <span className="text-[11px] text-amber-400 font-bold">★</span>
                    )}
                    {votes[album.id] === 1 && (
                      <span className="text-[11px] text-zinc-400">↑</span>
                    )}
                    {favoritedAlbums.includes(album.id) && (
                      <span className="text-[11px] text-red-400">♥</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer count */}
        {displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-900 text-zinc-700 text-[11px] tracking-wide">
            {displayed.length} album{displayed.length !== 1 ? "s" : ""}
            {filter ? ` · ${filter}` : ""}
          </div>
        )}
      </div>
    </div>

    {gifAlbum && (
      <GifModal
        album={gifAlbum}
        allAlbums={allAlbums}
        onClose={() => setGifAlbum(null)}
      />
    )}
  </>
  );
}
