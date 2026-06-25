"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAlbumStore, type VoteValue } from "@/store/albumStore";
import { useAveragesStore } from "@/store/averagesStore";
import { useUIStore } from "@/store/uiStore";
import { getUsername, setUsername, hasSetUsername, getEffectiveUserId } from "@/lib/identity";
import { getFlockifyUsername } from "@/data/uidToUsername";
import { useAuth } from "@/context/AuthContext";
import type { Album, GifComment } from "@/types";

interface GifModalProps {
  album: Album;
  allAlbums: Album[];
  onClose: () => void;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

type AddMode = "default" | "name-prompt" | "search" | "paste";

interface GifResult { id: string; title: string; url: string; preview: string }

export function GifModal({ album: initialAlbum, allAlbums, onClose }: GifModalProps) {
  const [album, setAlbum]             = useState(initialAlbum);
  const [addMode, setAddMode]         = useState<AddMode>("default");
  const [pendingMode, setPendingMode] = useState<"search" | "paste" | null>(null);
  const [nameInput, setNameInput]     = useState("");
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<GifResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [gifUrl, setGifUrl]           = useState("");
  const [preview, setPreview]         = useState("");
  const [pasteErr, setPasteErr]       = useState(false);
  const [artErr, setArtErr]           = useState(false);
  const [comments, setComments]       = useState<GifComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [posting, setPosting]         = useState(false);

  function navigateTo(next: typeof initialAlbum) {
    setAlbum(next);
    setAddMode("default");
    setQuery(""); setResults([]); setGifUrl(""); setPreview("");
    setPasteErr(false); setArtErr(false);
    setComments([]); setLoadingComments(true); setPosting(false);
  }

  const backdropRef = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const pasteRef    = useRef<HTMLInputElement>(null);
  const nameRef     = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const vote            = (useAlbumStore((s) => s.votes[album.id]) ?? 0) as VoteValue | 0;
  const setVote         = useAlbumStore((s) => s.setVote);
  const favoritedAlbums  = useAlbumStore((s) => s.favoritedAlbums);
  const toggleFavorited  = useAlbumStore((s) => s.toggleFavorited);
  const isFavorited      = favoritedAlbums.includes(album.id);

  const score           = useAveragesStore((s) => s.scores[album.id] ?? 0);
  const voterCount      = useAveragesStore((s) => s.voterCounts[album.id] ?? 0);
  const setCommentCount = useAveragesStore((s) => s.setCommentCount);
  const setLastCommentAt = useAveragesStore((s) => s.setLastCommentAt);
  const setScore        = useAveragesStore((s) => s.setScore);
  const openSignInModal = useUIStore((s) => s.openSignInModal);

  const visitorId  = user?.uid ?? getEffectiveUserId();
  const spotifyUrl = album.spotifyUri || `https://open.spotify.com/search/${encodeURIComponent(`${album.title} ${album.artist}`)}`;
  const appleMusicUrl = `https://music.apple.com/search?term=${encodeURIComponent(`${album.title} ${album.artist}`)}`;

  // iOS scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    setLoadingComments(true);
    fetch(`/api/comments?albumId=${encodeURIComponent(album.id)}`)
      .then((r) => r.json())
      .then((data) => {
        const loaded = data.comments ?? [];
        setComments(loaded);
        setCommentCount(album.id, loaded.length);
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [album.id, setCommentCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => { if (addMode === "search") searchRef.current?.focus(); }, [addMode]);
  useEffect(() => { if (addMode === "paste")  pasteRef.current?.focus();  }, [addMode]);
  useEffect(() => { if (addMode === "name-prompt") nameRef.current?.focus(); }, [addMode]);

  async function handleVote(newVote: VoteValue) {
    if (!user) {
      openSignInModal();
      return;
    }
    const userId = user.uid;
    const next: VoteValue | 0 = vote === newVote ? 0 : newVote;
    setVote(album.id, next);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id, userId, vote: next }),
      });
      const data = await res.json();
      if (typeof data.score === "number") setScore(album.id, data.score);
    } catch { /* silent */ }
  }

  async function handleFavorite() {
    if (!user) return;
    const userId = user.uid;
    const next = !isFavorited;
    toggleFavorited(album.id);
    fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, albumId: album.id, save: next }),
    }).catch(() => {});
  }

  const [related] = useState(() => {
    const descWords = (album.description ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    const albumGenres = new Set(album.genre.map((g) => g.toLowerCase()));
    const scored = allAlbums
      .filter((a) => a.id !== album.id && a.artworkUrl)
      .map((a) => {
        let score = 0;
        if (a.artist === album.artist) score += 10;
        for (const g of a.genre) { if (albumGenres.has(g.toLowerCase())) score += 4; }
        if (album.description) {
          const text = `${a.title} ${a.artist} ${a.description ?? ""}`.toLowerCase();
          for (const w of descWords) { if (text.includes(w)) score += 1; }
        }
        return { album: a, score };
      })
      .filter((x) => x.score > 0 || Math.random() < 0.02)
      .sort((a, b) => b.score - a.score || Math.random() - 0.5);
    return scored.slice(0, 4).map((x) => x.album);
  });

  function startAddMode(mode: "search" | "paste") {
    // If logged in or anonymous, skip the name prompt entirely
    if (!hasSetUsername() && !user) {
      setUsername("anon");
    }
    setAddMode(mode);
  }

  function confirmName() {
    setUsername(nameInput);
    const next = pendingMode ?? "search";
    setPendingMode(null);
    setAddMode(next);
  }

  async function postComment(url: string) {
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId: album.id,
          gifUrl: url,
          author: (user ? getFlockifyUsername(user.uid) : null) ?? getUsername(),
          visitorId,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        const updated = [...comments, data.comment];
        setComments(updated);
        setCommentCount(album.id, updated.length);
        setLastCommentAt(album.id, data.comment.timestamp);
      }
    } catch { /* fail silently */ }
    setPosting(false);
  }

  async function deleteComment(commentId: string) {
    try {
      await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id, commentId, visitorId }),
      });
      const updated = comments.filter((c) => c.id !== commentId);
      setComments(updated);
      setCommentCount(album.id, updated.length);
    } catch { /* fail silently */ }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/gifs?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.gifs ?? []);
    } catch { /* leave results empty */ }
    setSearching(false);
  }

  async function pickGif(url: string) {
    await postComment(url);
    setAddMode("default");
    setQuery("");
    setResults([]);
  }

  function handlePastePreview() {
    const url = gifUrl.trim();
    if (!url) return;
    try { if (new URL(url).protocol !== "https:") return; } catch { return; }
    setPasteErr(false);
    setPreview(url);
  }

  async function handlePastePost() {
    if (!preview || pasteErr) return;
    await postComment(preview);
    setGifUrl(""); setPreview(""); setPasteErr(false);
    setAddMode("default");
  }

  function resetAdd() {
    setAddMode("default");
    setQuery(""); setResults([]);
    setGifUrl(""); setPreview(""); setPasteErr(false);
  }

  const myName = hasSetUsername() ? getUsername() : null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-x-hidden overflow-y-auto overscroll-contain sm:flex sm:items-center sm:justify-center"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="flex flex-col w-full sm:h-full sm:max-h-[96vh] max-w-5xl mx-auto sm:rounded-lg sm:overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-zinc-900 shrink-0 bg-black">
          <button onClick={onClose} className="flex items-center gap-2 cursor-pointer group" aria-label="Back to feed">
            <div className="w-8 h-8 overflow-hidden shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flockify.png" alt="Flockify420" className="h-8 w-auto invert" style={{ maxWidth: "none" }} />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Flockify<span className="text-zinc-500 font-normal text-xs ml-0.5">4.2.0</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            {!user && myName !== null && (
              <button
                onClick={() => { setAddMode("name-prompt"); setNameInput(myName); }}
                className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors cursor-pointer"
              >
                {myName || "anon"} · <span className="text-zinc-700">change</span>
              </button>
            )}
            <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors cursor-pointer text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row sm:flex-1 sm:overflow-hidden sm:min-h-0">

          {/* Album art */}
          <div className="relative w-full aspect-square sm:w-[42%] shrink-0 bg-black sm:self-start">
            <Image
              src={artErr || !album.artworkUrl ? "/flockify.png" : album.artworkUrl}
              alt={album.title}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, 42vw"
              unoptimized
              onError={() => setArtErr(true)}
            />
          </div>

          {/* Details panel */}
          <div className="flex-1 bg-black text-white flex flex-col sm:overflow-hidden sm:min-h-0">
            <div className="sm:flex-1 sm:overflow-y-auto px-6 pt-4 pb-8 space-y-5">

              {/* Title + meta */}
              <div>
                <p className="text-[#4a90d9] font-semibold text-sm leading-snug">
                  {album.artist} – {album.title}{album.year ? ` (${album.year})` : ""}
                </p>
                {album.legacyStars > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: album.legacyStars }).map((_, i) => (
                      <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                )}
                <p className="text-zinc-500 text-xs mt-1">
                  posted by <span className="text-zinc-300">{album.creatorName || "unknown"}</span>
                </p>
              </div>

              {/* Vote row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Vote buttons */}
                <button
                  onClick={() => handleVote(1)}
                  title="Upvote (+1)"
                  className={`flex items-center justify-center w-9 h-9 rounded transition-colors cursor-pointer ${
                    vote === 1 ? "bg-green-900/60 text-green-400 border border-green-700" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button
                  onClick={() => handleVote(2)}
                  title="Star (+2)"
                  className={`flex items-center justify-center w-9 h-9 rounded transition-colors cursor-pointer ${
                    vote === 2 ? "bg-amber-900/60 text-amber-400 border border-amber-700" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={vote === 2 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button
                  onClick={() => handleVote(-1)}
                  title="Downvote (−1)"
                  className={`flex items-center justify-center w-9 h-9 rounded transition-colors cursor-pointer ${
                    vote === -1 ? "bg-red-900/60 text-red-400 border border-red-700" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {/* Score bubble */}
                {voterCount > 0 && (
                  <span className="ml-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold tabular-nums text-white">
                    {score >= 0 ? `+${score}` : String(score)}
                    <span className="text-zinc-500 font-normal ml-1">{voterCount}v</span>
                  </span>
                )}

{/* Favorite + streaming links */}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={handleFavorite}
                    className={`transition-colors cursor-pointer ${
                      isFavorited ? "text-red-500" : "text-zinc-600 hover:text-zinc-300"
                    } ${!user ? "opacity-30 cursor-not-allowed" : ""}`}
                    aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                    title={!user ? "Sign in to favorite" : isFavorited ? "Remove from favorites" : "Add to favorites"}
                  >
                    <HeartIcon filled={isFavorited} />
                  </button>
                  <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-[#1DB954] transition-colors" title="Open in Spotify">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </a>
                  <a href={appleMusicUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-[#fc3c44] transition-colors" title="Open in Apple Music">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1 5.338 5.338 0 001.98-.68 4.86 4.86 0 001.89-2.041c.28-.528.43-1.098.51-1.686.07-.5.1-1.003.1-1.507V6.57c0-.15-.003-.298-.013-.446zm-4.518 5.117l-5.002 2.902a1.35 1.35 0 01-.666.178 1.372 1.372 0 01-1.372-1.373V7.028a1.372 1.372 0 012.038-1.197l5.002 2.9a1.375 1.375 0 010 2.51z"/>
                    </svg>
                  </a>
                </div>
              </div>

              <hr className="border-zinc-800" />

              {/* Description */}
              {album.description && (
                <p className="text-zinc-400 text-sm leading-relaxed italic">
                  {album.description}
                </p>
              )}

              {/* GIF comments */}
              {loadingComments ? (
                <p className="text-zinc-700 text-xs text-center py-4">Loading comments…</p>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 group">
                      <div className="w-28 h-28 rounded overflow-hidden bg-zinc-900 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.gifUrl} alt="GIF" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-between h-28 min-w-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0 mt-0.5">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        <div>
                          <p className="text-zinc-500 text-xs">
                            <span className="text-zinc-300">{c.author || "Anonymous"}</span>
                            &nbsp;·&nbsp;{timeAgo(c.timestamp)}
                          </p>
                          {c.visitorId === visitorId && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="text-zinc-700 hover:text-red-400 text-xs transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            >remove</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Add GIF */}
              <div>
                {addMode !== "name-prompt" && (
                  <p className="text-zinc-400 text-sm mb-3">Add a gif comment:</p>
                )}

                {addMode === "name-prompt" && (
                  <div className="space-y-3">
                    <p className="text-zinc-400 text-sm">What should we call you?</p>
                    <input
                      ref={nameRef}
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && confirmName()}
                      placeholder="Your name (leave blank for anonymous)"
                      maxLength={32}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button onClick={resetAdd} className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors">Cancel</button>
                      <button onClick={confirmName} className="flex-1 py-2 bg-white text-black font-semibold rounded text-sm cursor-pointer hover:bg-zinc-200 transition-colors">Continue</button>
                    </div>
                  </div>
                )}

                {addMode === "default" && (
                  <div className="flex gap-3">
                    <button onClick={() => startAddMode("search")} className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-400 rounded text-center text-sm text-zinc-300 hover:text-white transition-colors cursor-pointer">Search for a gif</button>
                    <button onClick={() => startAddMode("paste")} className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-400 rounded text-center text-sm text-zinc-300 hover:text-white transition-colors cursor-pointer">Paste gif link</button>
                  </div>
                )}

                {addMode === "search" && (
                  <div className="space-y-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for a GIF…"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                      <button type="submit" disabled={searching || !query.trim()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {searching ? "…" : "Search"}
                      </button>
                    </form>
                    {searching && <p className="text-zinc-600 text-xs text-center py-4">Loading…</p>}
                    {!searching && results.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {results.map((gif) => (
                          <button key={gif.id} onClick={() => pickGif(gif.url)} disabled={posting} className="relative aspect-square rounded overflow-hidden bg-zinc-900 cursor-pointer hover:ring-2 hover:ring-white transition-all disabled:opacity-50" title={gif.title}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {!searching && query && results.length === 0 && (
                      <p className="text-zinc-600 text-xs text-center py-4">No results — try a different search.</p>
                    )}
                    <button onClick={resetAdd} className="w-full py-2 border border-zinc-800 hover:border-zinc-600 rounded text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">Cancel</button>
                  </div>
                )}

                {addMode === "paste" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        ref={pasteRef}
                        type="url"
                        value={gifUrl}
                        onChange={(e) => setGifUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePastePreview()}
                        placeholder="https://media.giphy.com/…"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                      <button onClick={handlePastePreview} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300 cursor-pointer transition-colors">Preview</button>
                    </div>
                    {preview && !pasteErr && (
                      <div className="rounded overflow-hidden bg-zinc-900 max-h-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="preview" className="max-h-40 object-contain" onError={() => setPasteErr(true)} />
                      </div>
                    )}
                    {pasteErr && <p className="text-red-400 text-xs">Couldn&apos;t load that GIF — check the URL.</p>}
                    <div className="flex gap-2">
                      <button onClick={resetAdd} className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 hover:text-white cursor-pointer transition-colors">Cancel</button>
                      <button onClick={handlePastePost} disabled={!preview || pasteErr || posting} className="flex-1 py-2 bg-white text-black font-semibold rounded text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors">Post</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Related Albums */}
              {related.length > 0 && (
                <>
                  <hr className="border-zinc-800" />
                  <div>
                    <p className="text-zinc-400 text-sm font-medium mb-3">Related Albums</p>
                    <div className="flex gap-2">
                      {related.map((rel) => (
                        <button
                          key={rel.id}
                          onClick={() => navigateTo(rel)}
                          className="relative w-16 h-16 rounded overflow-hidden bg-zinc-900 shrink-0 hover:opacity-75 transition-opacity cursor-pointer"
                          title={`${rel.artist} – ${rel.title}`}
                        >
                          <Image src={rel.artworkUrl || "/flockify.png"} alt={rel.title} fill className="object-cover" sizes="64px" unoptimized />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
