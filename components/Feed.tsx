"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AlbumListCard } from "./AlbumListCard";
import { AlbumGridCard } from "./AlbumGridCard";
import { useAlbumStore } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { useAuth } from "@/context/AuthContext";
import type { Album, SortOrder } from "@/types";

interface FeedProps {
  albums: Album[];
}

const SORT_TABS: { label: string; value: SortOrder }[] = [
  { label: "NEW",      value: "new"      },
  { label: "TOP",      value: "top"      },
  { label: "COMMENTS", value: "comments" },
];

type ViewMode    = "classic" | "grid";
type StatusFilter = "all" | "voted" | "unvoted" | "favorited";

export function Feed({ albums }: FeedProps) {
  const [viewMode, setViewMode]         = useState<ViewMode>("classic");
  const [sortOrder, setSortOrder]       = useState<SortOrder>("new");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortDir, setSortDir]           = useState<"desc" | "asc">("desc");
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const searchRef                       = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const votes           = useAlbumStore((s) => s.votes);
  const comments        = useAlbumStore((s) => s.comments);
  const favoritedAlbums = useAlbumStore((s) => s.favoritedAlbums);
  const loadVotes       = useAlbumStore((s) => s.loadVotes);

  const scores        = useAveragesStore((s) => s.scores);
  const lastCommentAt = useAveragesStore((s) => s.lastCommentAt);
  const fetchScores   = useAveragesStore((s) => s.fetchScores);

  const albumIds = albums.map((a) => a.id);

  const refresh = useCallback(async () => {
    fetchScores(albumIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync votes whenever auth state changes (login / logout)
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const res = await fetch("/api/my-votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, albumIds }),
        });
        const data = await res.json();
        if (data.votes) loadVotes(data.votes);
      } catch { /* silent */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    function reset() {
      setViewMode("classic");
      setSortOrder("new");
      setSortDir("desc");
      setStatusFilter("all");
      setSearchOpen(false);
      setSearchQuery("");
    }
    window.addEventListener("reset-feed", reset);
    return () => window.removeEventListener("reset-feed", reset);
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredAndSorted = useMemo(() => {
    const dir = sortDir === "desc" ? 1 : -1;
    const filtered = albums.filter((a) => {
      if (searchLower && !a.title.toLowerCase().includes(searchLower) && !a.artist.toLowerCase().includes(searchLower) && !(a.description ?? "").toLowerCase().includes(searchLower)) return false;
      if (statusFilter === "voted"    && !votes[a.id])                    return false;
      if (statusFilter === "unvoted"  && votes[a.id])                     return false;
      if (statusFilter === "favorited" && !favoritedAlbums.includes(a.id)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "new":      return dir * ((b.postOrder ?? -1) - (a.postOrder ?? -1));
        case "top":      return dir * ((scores[b.id] ?? b.legacyScore) - (scores[a.id] ?? a.legacyScore));
        case "comments": return dir * ((lastCommentAt[b.id] ?? 0) - (lastCommentAt[a.id] ?? 0));
      }
    });
  }, [albums, sortOrder, sortDir, scores, lastCommentAt, searchLower, statusFilter, votes, favoritedAlbums]);

  const votedCount  = albums.filter((a) => votes[a.id]).length;
  const totalGifs   = Object.values(comments).reduce((n, arr) => n + arr.length, 0);

  return (
    <div>
      {/* Sort tabs + view toggle */}
      <div className="flex items-center border-b border-zinc-900">
        {SORT_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              if (sortOrder === value) setSortDir((d) => d === "desc" ? "asc" : "desc");
              else { setSortOrder(value); setSortDir("desc"); }
            }}
            className={`px-5 py-2.5 text-xs tracking-widest font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              sortOrder === value ? "text-white" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {label}
            {sortOrder === value && (
              <span className="text-[10px] leading-none opacity-60">
                {sortDir === "desc" ? "↓" : "↑"}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto pr-3 flex items-center gap-0.5">
          <button
            onClick={() => {
              const next = !searchOpen;
              setSearchOpen(next);
              if (!next) setSearchQuery("");
              else setTimeout(() => searchRef.current?.focus(), 50);
            }}
            title="Search"
            aria-label="Search"
            className={`p-1.5 rounded transition-colors cursor-pointer ${searchOpen ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            {searchOpen
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            }
          </button>
          <button
            onClick={() => setViewMode("classic")}
            title="Classic"
            aria-label="Classic view"
            className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === "classic" ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            title="Grid"
            aria-label="Grid view"
            className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === "grid" ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-b border-zinc-900 px-4 py-2.5">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setSearchOpen(false), setSearchQuery(""))}
            placeholder="Search albums, artists, descriptions…"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      )}

      {/* Status filter chips + counts */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-900 overflow-x-auto overflow-y-hidden"
        style={{ touchAction: "pan-x" }}
      >
        <button
          onClick={() => { setStatusFilter("all"); }}
          className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
            statusFilter === "all" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          {albums.length} albums
        </button>
        {votedCount > 0 && (
          <button
            onClick={() => setStatusFilter(statusFilter === "voted" ? "all" : "voted")}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
              statusFilter === "voted" ? "bg-amber-400 text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {votedCount} voted
          </button>
        )}
        {totalGifs > 0 && <span className="text-zinc-700 text-[11px] shrink-0">{totalGifs} GIFs</span>}
        {favoritedAlbums.length > 0 && (
          <button
            onClick={() => setStatusFilter(statusFilter === "favorited" ? "all" : "favorited")}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
              statusFilter === "favorited" ? "bg-red-500 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            ♥ Favorites
          </button>
        )}
      </div>

      {viewMode === "classic" ? (
        <div className="flex flex-col gap-3 py-3 px-2 sm:px-0">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No albums match.</div>
          ) : (
            filteredAndSorted.map((album) => (
              <AlbumListCard key={album.id} album={album} allAlbums={albums} />
            ))
          )}
        </div>
      ) : (
        <div className="px-2 sm:px-3 py-3">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No albums match.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {filteredAndSorted.map((album) => (
                <AlbumGridCard key={album.id} album={album} allAlbums={albums} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
