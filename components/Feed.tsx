"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AlbumListCard } from "./AlbumListCard";
import { AlbumGridCard } from "./AlbumGridCard";
import { useAlbumStore } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { getUsername } from "@/lib/identity";
import type { Album, Batch, SortOrder, EraFilter } from "@/types";

interface FeedProps {
  batches: Batch[];
  allDiscography?: Album[];
}

const ERA_TABS: { label: string; value: EraFilter }[] = [
  { label: "ALL TIME", value: "all" },
  { label: "50s",      value: "50s"    },
  { label: "60s",      value: "60s"    },
  { label: "70s",      value: "70s"    },
  { label: "80s",      value: "80s"    },
  { label: "90s",      value: "90s"    },
  { label: "2000s+",   value: "2000s+" },
];

const SORT_TABS: { label: string; value: SortOrder }[] = [
  { label: "NEW",      value: "new"      },
  { label: "TOP",      value: "top"      },
  { label: "COMMENTS", value: "comments" },
];

const COLUMBIA_LABELS = new Set([
  "Columbia", "Columbia/Legacy", "CBS", "CBS Special Products", "CBS/Sony", "Legacy",
]);

type ViewMode    = "classic" | "grid";
type TypeFilter  = "all" | "studio" | "live" | "compilation";
type LabelFilter = "all" | "Columbia" | "Prestige" | "Blue Note" | "Other";
type StatusFilter = "all" | "rated" | "unrated" | "favorited";

function getLabelGroup(label?: string): "Columbia" | "Prestige" | "Blue Note" | "Other" {
  if (!label) return "Other";
  if (COLUMBIA_LABELS.has(label)) return "Columbia";
  if (label === "Prestige") return "Prestige";
  if (label === "Blue Note") return "Blue Note";
  return "Other";
}

function getEra(year: number): EraFilter {
  if (year < 1960) return "50s";
  if (year < 1970) return "60s";
  if (year < 1980) return "70s";
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  return "2000s+";
}

export function Feed({ batches, allDiscography }: FeedProps) {
  const [viewMode, setViewMode]         = useState<ViewMode>("classic");
  const [eraFilter, setEraFilter]       = useState<EraFilter>("all");
  const [sortOrder, setSortOrder]       = useState<SortOrder>("new");
  const [labelFilter, setLabelFilter]   = useState<LabelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortDir, setSortDir]           = useState<"desc" | "asc">("desc");
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const searchRef                       = useRef<HTMLInputElement>(null);

  const ratings         = useAlbumStore((s) => s.ratings);
  const comments        = useAlbumStore((s) => s.comments);
  const favoritedAlbums = useAlbumStore((s) => s.favoritedAlbums);
  const loadRatings     = useAlbumStore((s) => s.loadRatings);

  const averages       = useAveragesStore((s) => s.averages);
  const lastCommentAt  = useAveragesStore((s) => s.lastCommentAt);
  const fetchAverages  = useAveragesStore((s) => s.fetchAverages);

  const batch      = batches[0];
  const gridSource = batch.albums;
  const albumIds   = gridSource.map((a) => a.id);

  const refresh = useCallback(async () => {
    fetchAverages(albumIds);
    const username = getUsername();
    if (username) {
      try {
        const res = await fetch("/api/my-ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: username, albumIds }),
        });
        const data = await res.json();
        if (data.ratings) loadRatings(data.ratings);
      } catch { /* silent */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    function reset() {
      setViewMode("classic");
      setEraFilter("all");
      setSortOrder("new");
      setSortDir("desc");
      setLabelFilter("all");
      setStatusFilter("all");
      setSearchOpen(false);
      setSearchQuery("");
    }
    window.addEventListener("reset-feed", reset);
    return () => window.removeEventListener("reset-feed", reset);
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();

  // Classic view: reviewed studio albums only
  const filteredAndSorted = useMemo(() => {
    const filtered = batch.albums.filter((a) => {
      if (!a.description) return false;
      if (eraFilter !== "all" && !(a.year > 0 && getEra(a.year) === eraFilter)) return false;
      if (searchLower && !a.title.toLowerCase().includes(searchLower) && !(a.description ?? "").toLowerCase().includes(searchLower)) return false;
      if (statusFilter === "rated" && !(ratings[a.id] ?? 0)) return false;
      if (statusFilter === "unrated" && (ratings[a.id] ?? 0)) return false;
      if (statusFilter === "favorited" && !favoritedAlbums.includes(a.id)) return false;
      return true;
    });
    const dir = sortDir === "desc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "new":      return dir * ((b.postOrder ?? -1) - (a.postOrder ?? -1));
        case "top":      return dir * ((averages[b.id] ?? 0) - (averages[a.id] ?? 0));
        case "comments": return dir * ((lastCommentAt[b.id] ?? 0) - (lastCommentAt[a.id] ?? 0));
      }
    });
  }, [batch.albums, eraFilter, sortOrder, sortDir, averages, lastCommentAt, searchLower, statusFilter, ratings, favoritedAlbums]);

  // Grid view: reviewed albums only, with extra filters
  const gridAlbums = useMemo(() => {
    let list = gridSource.filter((a) => {
      if (!a.description) return false;
      if (searchLower && !a.title.toLowerCase().includes(searchLower) && !(a.description ?? "").toLowerCase().includes(searchLower)) return false;
      return true;
    });
    if (eraFilter !== "all")
      list = list.filter((a) => a.year > 0 && getEra(a.year) === eraFilter);
    if (labelFilter !== "all")
      list = list.filter((a) => getLabelGroup(a.label) === labelFilter);
    if (statusFilter === "rated")
      list = list.filter((a) => (ratings[a.id] ?? 0) > 0);
    if (statusFilter === "unrated")
      list = list.filter((a) => !(ratings[a.id] ?? 0));
    if (statusFilter === "favorited")
      list = list.filter((a) => favoritedAlbums.includes(a.id));
    const dir = sortDir === "desc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortOrder) {
        case "new":      return dir * ((b.postOrder ?? -1) - (a.postOrder ?? -1));
        case "top":      return dir * ((averages[b.id] ?? 0) - (averages[a.id] ?? 0));
        case "comments": return dir * ((lastCommentAt[b.id] ?? 0) - (lastCommentAt[a.id] ?? 0));
      }
    });
  }, [gridSource, eraFilter, labelFilter, statusFilter, sortOrder, sortDir, averages, lastCommentAt, ratings, favoritedAlbums, searchLower]);

  const reviewedCount = batch.albums.filter((a) => !!a.description).length;
  const ratedCount    = batch.albums.filter((a) => ratings[a.id]).length;
  const totalGifs  = Object.values(comments).reduce((n, arr) => n + arr.length, 0);

  return (
    <div>
      {/* Batch title */}
      <div className="flex items-center justify-center py-3 border-b border-zinc-900">
        <span className="text-white font-semibold tracking-wide">{batch.name}</span>
        <span className="text-zinc-600 text-sm ml-2">▾</span>
      </div>

      {/* Era filter */}
      <div className="flex items-center border-b border-zinc-900 overflow-x-auto overflow-y-hidden" style={{ touchAction: "pan-x" }}>
        <span className="text-zinc-700 px-3 text-sm shrink-0">▾</span>
        {ERA_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setEraFilter(value)}
            className={`px-4 py-3 text-xs font-semibold tracking-widest shrink-0 transition-colors cursor-pointer border-b-2 -mb-px ${
              eraFilter === value
                ? "text-red-500 border-red-500"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto px-4 flex items-center gap-3 text-xs shrink-0">
          {viewMode === "classic" ? (
            <>
              <button
                onClick={() => { setEraFilter("all"); setStatusFilter("all"); }}
                className={`cursor-pointer transition-colors hover:text-zinc-300 ${statusFilter === "all" ? "text-white" : "text-zinc-600"}`}
              >{reviewedCount} albums</button>
              {ratedCount > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === "rated" ? "all" : "rated")}
                  className={`cursor-pointer transition-colors hover:text-zinc-300 ${statusFilter === "rated" ? "text-white" : "text-zinc-600"}`}
                >{ratedCount} rated</button>
              )}
              {totalGifs > 0 && <span className="text-zinc-600">{totalGifs} GIFs</span>}
            </>
          ) : (
            <span className="text-zinc-600">{gridAlbums.length} of {gridSource.length}</span>
          )}
        </div>
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
            {/* List icon */}
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
            {/* Grid icon */}
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
            placeholder="Search albums and descriptions…"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      )}

      {/* Grid-only filter chips */}
      {viewMode === "grid" && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-900 overflow-x-auto overflow-y-hidden"
          style={{ touchAction: "pan-x" }}
        >
          {(["all", "Columbia", "Prestige", "Blue Note", "Other"] as LabelFilter[]).map((l) => (
            <button
              key={l}
              onClick={() => setLabelFilter(l)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                labelFilter === l ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {l === "all" ? "All labels" : l}
            </button>
          ))}

          <span className="text-zinc-800 shrink-0">·</span>

          {(["all", "rated", "unrated"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                statusFilter === s
                  ? s === "all" ? "bg-white text-black" : "bg-amber-400 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {favoritedAlbums.length > 0 && (
            <button
              onClick={() => setStatusFilter(statusFilter === "favorited" ? "all" : "favorited")}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                statusFilter === "favorited" ? "bg-amber-400 text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              Favorites
            </button>
          )}
        </div>
      )}

      {viewMode === "classic" ? (
        <div className="flex flex-col gap-3 py-3 px-2 sm:px-0">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No studio albums in this era.</div>
          ) : (
            filteredAndSorted.map((album) => (
              <AlbumListCard key={album.id} album={album} allAlbums={batch.albums} />
            ))
          )}
        </div>
      ) : (
        <div className="px-2 sm:px-3 py-3">
          {gridAlbums.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No albums match these filters.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {gridAlbums.map((album) => (
                <AlbumGridCard key={album.id} album={album} allAlbums={gridSource} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
