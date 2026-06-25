"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AlbumListCard } from "./AlbumListCard";
import { AlbumGridCard } from "./AlbumGridCard";
import { PostAlbumModal } from "./PostAlbumModal";
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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type ViewMode    = "classic" | "grid";
type StatusFilter = "all" | "voted" | "unvoted" | "favorited";

export function Feed({ albums }: FeedProps) {
  const [viewMode, setViewMode]         = useState<ViewMode>("classic");
  const [sortOrder, setSortOrder]       = useState<SortOrder>("new");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortDir, setSortDir]           = useState<"desc" | "asc">("desc");
  const [yearFilter, setYearFilter]     = useState<number | null>(null);
  const [monthFilter, setMonthFilter]   = useState<number | null>(null);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [visibleCount, setVisibleCount]   = useState(40);
  const searchRef   = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const votes           = useAlbumStore((s) => s.votes);
  const comments        = useAlbumStore((s) => s.comments);
  const favoritedAlbums = useAlbumStore((s) => s.favoritedAlbums);
  const loadVotes       = useAlbumStore((s) => s.loadVotes);
  const dynamicAlbums     = useAlbumStore((s) => s.dynamicAlbums);
  const setDynamicAlbums  = useAlbumStore((s) => s.setDynamicAlbums);
  const addDynamicAlbum   = useAlbumStore((s) => s.addDynamicAlbum);
  const removeDynamicAlbum = useAlbumStore((s) => s.removeDynamicAlbum);

  const scores        = useAveragesStore((s) => s.scores);
  const lastCommentAt = useAveragesStore((s) => s.lastCommentAt);
  const fetchScores   = useAveragesStore((s) => s.fetchScores);

  // Merge dynamic + static albums (dynamic on top since they have higher postOrder)
  const allAlbums = useMemo(() => [...dynamicAlbums, ...albums], [dynamicAlbums, albums]);
  const albumIds  = useMemo(() => allAlbums.map((a) => a.id), [allAlbums]);

  // Revalidate dynamic posts in background on mount (stale-while-revalidate)
  useEffect(() => {
    fetch("/api/dynamic-posts")
      .then((r) => r.json())
      .then((data) => { if (data.albums) setDynamicAlbums(data.albums); })
      .catch(() => {});
  }, [setDynamicAlbums]);

  // Existing genres/labels/tags for autocomplete
  const allGenres = useMemo(() => [...new Set(allAlbums.flatMap((a) => a.genre))].sort(), [allAlbums]);
  const allLabels = useMemo(() => [...new Set(allAlbums.flatMap((a) => a.labels))].sort(), [allAlbums]);
  const allTags   = useMemo(() => [...new Set(allAlbums.flatMap((a) => a.tags))].sort(), [allAlbums]);
  const existingSet = useMemo(
    () => new Set(allAlbums.map((a) => `${a.title.toLowerCase()}::${a.artist.toLowerCase()}`)),
    [allAlbums]
  );

  // Year + month breakdowns
  const years = useMemo(() => {
    const ys = [...new Set(allAlbums.map((a) => new Date(a.postOrder).getFullYear()))];
    return ys.sort((a, b) => b - a);
  }, [allAlbums]);

  const monthsForYear = useMemo(() => {
    if (!yearFilter) return [];
    const ms = [...new Set(
      allAlbums
        .filter((a) => new Date(a.postOrder).getFullYear() === yearFilter)
        .map((a) => new Date(a.postOrder).getMonth())
    )];
    return ms.sort((a, b) => a - b);
  }, [allAlbums, yearFilter]);

  const albumIdsRef = useRef(albumIds);
  albumIdsRef.current = albumIds;

  const refresh = useCallback(async () => {
    fetchScores(albumIdsRef.current);
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
      setYearFilter(null);
      setMonthFilter(null);
      setSearchOpen(false);
      setSearchQuery("");
      setShowPostModal(false);
    }
    window.addEventListener("reset-feed", reset);
    return () => window.removeEventListener("reset-feed", reset);
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredAndSorted = useMemo(() => {
    const dir = sortDir === "desc" ? 1 : -1;
    const filtered = allAlbums.filter((a) => {
      if (searchLower && !a.title.toLowerCase().includes(searchLower) && !a.artist.toLowerCase().includes(searchLower) && !(a.description ?? "").toLowerCase().includes(searchLower)) return false;
      if (statusFilter === "voted"    && !votes[a.id])                    return false;
      if (statusFilter === "unvoted"  && votes[a.id])                     return false;
      if (statusFilter === "favorited" && !favoritedAlbums.includes(a.id)) return false;
      if (yearFilter !== null && new Date(a.postOrder).getFullYear() !== yearFilter) return false;
      if (monthFilter !== null && new Date(a.postOrder).getMonth() !== monthFilter) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "new":      return dir * ((b.postOrder ?? -1) - (a.postOrder ?? -1));
        case "top":      return dir * ((scores[b.id] ?? b.legacyScore) - (scores[a.id] ?? a.legacyScore));
        case "comments": return dir * ((lastCommentAt[b.id] ?? 0) - (lastCommentAt[a.id] ?? 0));
      }
    });
  }, [allAlbums, sortOrder, sortDir, scores, lastCommentAt, searchLower, statusFilter, votes, favoritedAlbums, yearFilter, monthFilter]);

  // Reset visible count when filters/sort/view change
  useEffect(() => { setVisibleCount(40); }, [sortOrder, sortDir, statusFilter, yearFilter, monthFilter, searchQuery, viewMode]);

  // Infinite scroll: load 40 more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((n) => n + 40); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredAndSorted]);

  const visibleAlbums = useMemo(() => filteredAndSorted.slice(0, visibleCount), [filteredAndSorted, visibleCount]);

  const votedCount  = allAlbums.filter((a) => votes[a.id]).length;
  const totalGifs   = Object.values(comments).reduce((n, arr) => n + arr.length, 0);

  return (
    <div>
      {/* Post an album */}
      <div className="flex justify-center border-b border-zinc-900 py-2">
        <button
          onClick={() => setShowPostModal(true)}
          className="flex items-center gap-2 text-zinc-600 hover:text-zinc-300 text-xs tracking-wide transition-colors cursor-pointer px-3 py-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
          </svg>
          post an album
        </button>
      </div>

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

      {/* Year / month filter */}
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-900 overflow-x-auto overflow-y-hidden"
        style={{ touchAction: "pan-x" }}
      >
        <button
          onClick={() => { setYearFilter(null); setMonthFilter(null); }}
          className={`shrink-0 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-widest transition-colors cursor-pointer ${
            yearFilter === null ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >ALL</button>
        <span className="text-zinc-800 shrink-0">|</span>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => {
              if (yearFilter === y) { setYearFilter(null); setMonthFilter(null); }
              else { setYearFilter(y); setMonthFilter(null); }
            }}
            className={`shrink-0 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
              yearFilter === y ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-300"
            }`}
          >{y}</button>
        ))}
        {yearFilter !== null && monthsForYear.length > 1 && (
          <>
            <span className="text-zinc-800 shrink-0">|</span>
            {monthsForYear.map((m) => (
              <button
                key={m}
                onClick={() => setMonthFilter(monthFilter === m ? null : m)}
                className={`shrink-0 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  monthFilter === m ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-300"
                }`}
              >{MONTH_NAMES[m]}</button>
            ))}
          </>
        )}
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
          {allAlbums.length} albums
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
            <>
              {visibleAlbums.map((album) => (
                <AlbumListCard
                  key={album.id}
                  album={album}
                  allAlbums={allAlbums}
                  onDelete={album.id.startsWith("dyn_")
                    ? () => removeDynamicAlbum(album.id)
                    : undefined}
                />
              ))}
              {visibleCount < filteredAndSorted.length && (
                <div ref={sentinelRef} className="py-4 text-center text-zinc-700 text-xs">
                  {visibleAlbums.length} of {filteredAndSorted.length}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="px-2 sm:px-3 py-3">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No albums match.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {visibleAlbums.map((album) => (
                  <AlbumGridCard key={album.id} album={album} allAlbums={allAlbums} />
                ))}
              </div>
              {visibleCount < filteredAndSorted.length && (
                <div ref={sentinelRef} className="py-4 text-center text-zinc-700 text-xs">
                  {visibleAlbums.length} of {filteredAndSorted.length}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showPostModal && (
        <PostAlbumModal
          onClose={() => setShowPostModal(false)}
          existingSet={existingSet}
          allGenres={allGenres}
          allLabels={allLabels}
          allTags={allTags}
          onPosted={(album) => addDynamicAlbum(album)}
        />
      )}
    </div>
  );
}
