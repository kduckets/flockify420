"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { Album } from "@/types";

function firebaseErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
      return "Invalid email or password.";
    if (code === "auth/too-many-requests") return "Too many attempts — try again later.";
    if (code === "auth/invalid-email") return "Invalid email address.";
  }
  return "Sign in failed. Try again.";
}

interface SearchResult {
  id: string;
  album: string;
  artist: string;
  artworkUrl: string;
  releaseDate: string;
  genre: string[];
}

interface Props {
  onClose: () => void;
  existingSet: Set<string>;           // "title::artist" lowercase
  allGenres: string[];
  allLabels: string[];
  allTags: string[];
  onPosted: (album: Album) => void;
}

// ─── Chip input with autocomplete ────────────────────────────────────────────
function ChipInput({
  values, onChange, suggestions, placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [text, setText]   = useState("");
  const [open, setOpen]   = useState(false);
  const inputRef          = useRef<HTMLInputElement>(null);

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(text.toLowerCase()) && !values.includes(s))
    .slice(0, 8);

  function add(val: string) {
    const v = val.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1 px-2 pt-1.5 pb-1 bg-zinc-900 border border-zinc-700 rounded min-h-[36px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span key={v} className="flex items-center gap-0.5 pl-2 pr-1 py-0.5 bg-zinc-700 text-white text-xs rounded-full">
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)); }}
              className="text-zinc-400 hover:text-white leading-none ml-0.5"
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (text.trim()) add(text); }
            if (e.key === "Backspace" && !text && values.length > 0) onChange(values.slice(0, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[90px] bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none py-0.5"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-zinc-950 border border-zinc-700 rounded shadow-xl max-h-44 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export function PostAlbumModal({ onClose, existingSet, allGenres, allLabels, allTags, onPosted }: Props) {
  const { user } = useAuth();

  const [step, setStep]           = useState<"search" | "details">("search");
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState<SearchResult | null>(null);

  const [description, setDescription] = useState("");
  const [genres, setGenres]           = useState<string[]>([]);
  const [labels, setLabels]           = useState<string[]>([]);
  const [tags, setTags]               = useState<string[]>([]);
  const [enriching, setEnriching]     = useState(false);
  const [posting, setPosting]         = useState(false);
  const [postError, setPostError]     = useState("");

  const [showLogin, setShowLogin]     = useState(false);
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPass, setLoginPass]     = useState("");
  const [loginError, setLoginError]   = useState("");
  const [loginBusy, setLoginBusy]     = useState(false);

  const queryRef    = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const emailRef    = useRef<HTMLInputElement>(null);

  // Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus search on open (skip if login form is showing)
  useEffect(() => { if (!showLogin) setTimeout(() => queryRef.current?.focus(), 50); }, [showLogin]);
  useEffect(() => { if (showLogin)  setTimeout(() => emailRef.current?.focus(), 50); }, [showLogin]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
      setShowLogin(false);
      setLoginEmail(""); setLoginPass("");
    } catch (err) {
      setLoginError(firebaseErrorMessage(err));
    }
    setLoginBusy(false);
  }

  // iOS scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position  = "fixed";
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = "100%";
    document.body.style.overflow  = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top      = "";
      document.body.style.width    = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search-albums?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch { /* silent */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function selectAlbum(r: SearchResult) {
    setSelected(r);
    setDescription("");
    setGenres(r.genre);
    setLabels([]);
    setTags([]);
    setPostError("");
    setStep("details");

    // Discogs enrichment
    setEnriching(true);
    try {
      const res = await fetch(
        `/api/discogs-enrich?artist=${encodeURIComponent(r.artist)}&album=${encodeURIComponent(r.album)}`
      );
      const data = await res.json();
      setGenres((prev) => [...new Set([...prev, ...(data.genre ?? [])])]);
      setLabels((prev) => [...new Set([...prev, ...(data.labels ?? [])])]);
      // Discogs "style" → tags
      setTags((prev) => [...new Set([...prev, ...(data.styles ?? [])])]);
    } catch { /* silent */ }
    setEnriching(false);
  }

  async function handlePost() {
    if (!user || !selected) return;
    setPosting(true);
    setPostError("");
    try {
      const res = await fetch("/api/post-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          album:       selected.album,
          artist:      selected.artist,
          artworkUrl:  selected.artworkUrl,
          spotifyUri:  "",
          releaseDate: selected.releaseDate,
          summary:     description.trim(),
          labels,
          genre:  genres,
          tags,
          creatorName: user.displayName || user.email?.split("@")[0] || "Anonymous",
          userId:      user.uid,
        }),
      });
      const data = await res.json();
      if (data.error) { setPostError(data.error); setPosting(false); return; }

      const year = parseInt(selected.releaseDate) || 0;
      const newAlbum: Album = {
        id:          data.id,
        title:       selected.album,
        artist:      selected.artist,
        year,
        artworkUrl:  selected.artworkUrl,
        spotifyUri:  "",
        description: description.trim() || undefined,
        labels,
        genre:       genres,
        tags,
        creatorName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        createdTs:   data.createdTs,
        postOrder:   new Date(data.createdTs).getTime(),
        legacyScore: 0,
        legacyStars: 0,
      };
      onPosted(newAlbum);
      onClose();
    } catch {
      setPostError("Something went wrong — try again.");
    }
    setPosting(false);
  }

  const alreadyPosted = (r: SearchResult) =>
    existingSet.has(`${r.album.toLowerCase()}::${r.artist.toLowerCase()}`);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-hidden flex items-start justify-center sm:items-center"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-zinc-950 border-0 sm:border sm:border-zinc-800 sm:rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-900 shrink-0">
          {step === "details" && (
            <button
              onClick={() => setStep("search")}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer mr-1"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
          )}
          <h2 className="text-white font-semibold text-sm tracking-wide flex-1">
            {step === "search" ? "Post an Album" : "Album Details"}
          </h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors cursor-pointer text-lg leading-none">✕</button>
        </div>

        {/* ── Step 1: Search ── */}
        {step === "search" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Login gate */}
            {!user && !showLogin && (
              <div className="px-5 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Sign in to post an album.</span>
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-white text-sm font-semibold hover:text-zinc-300 transition-colors cursor-pointer"
                >Sign in →</button>
              </div>
            )}

            {/* Inline sign-in form */}
            {!user && showLogin && (
              <div className="px-5 py-4 bg-zinc-900 border-b border-zinc-800">
                <p className="text-white font-semibold text-sm mb-3">Sign in to Flockify</p>
                <form onSubmit={handleLogin} className="space-y-2.5">
                  <input
                    ref={emailRef}
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                  {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => { setShowLogin(false); setLoginError(""); }}
                      className="flex-1 py-1.5 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors"
                    >Cancel</button>
                    <button
                      type="submit"
                      disabled={loginBusy || !loginEmail || !loginPass}
                      className="flex-1 py-1.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >{loginBusy ? "Signing in…" : "Sign in"}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Search input */}
            <div className="px-4 py-3 border-b border-zinc-900 shrink-0">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 focus-within:border-zinc-400 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={queryRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by album or artist…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                {searching && (
                  <svg className="animate-spin text-zinc-500 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 && !searching && query.trim() && (
                <p className="text-center py-12 text-zinc-600 text-sm">No albums found — try a different search.</p>
              )}
              {results.length === 0 && !query.trim() && (
                <p className="text-center py-12 text-zinc-700 text-sm">Search for an album to post it to Flockify.</p>
              )}
              <div className="py-2">
                {results.map((r) => {
                  const exists = alreadyPosted(r);
                  return (
                    <button
                      key={r.id}
                      onClick={() => user && selectAlbum(r)}
                      disabled={!user}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                        user ? "hover:bg-zinc-900" : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-800">
                        {r.artworkUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.artworkUrl} alt={r.album} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xl">♪</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug truncate">{r.album}</p>
                        <p className="text-zinc-400 text-xs truncate">{r.artist}{r.releaseDate ? ` · ${r.releaseDate}` : ""}</p>
                        {r.genre.length > 0 && <p className="text-zinc-600 text-[11px] truncate">{r.genre.join(", ")}</p>}
                      </div>
                      {exists && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full font-medium">
                          In Flockify
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === "details" && selected && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-4">

              {/* Selected album preview */}
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-900">
                <div className="w-14 h-14 rounded overflow-hidden bg-zinc-800 shrink-0">
                  {selected.artworkUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selected.artworkUrl} alt={selected.album} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl">♪</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-snug truncate">{selected.album}</p>
                  <p className="text-zinc-400 text-xs">{selected.artist}{selected.releaseDate ? ` · ${selected.releaseDate}` : ""}</p>
                  {alreadyPosted(selected) && (
                    <span className="text-[10px] text-amber-400">Already posted to Flockify</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Description <span className="text-zinc-600">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why are you posting this album?"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors resize-none"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1.5">
                  Genre
                  {enriching && <span className="text-zinc-600 text-[10px]">fetching from Discogs…</span>}
                </label>
                <ChipInput values={genres} onChange={setGenres} suggestions={allGenres} placeholder="e.g. Rock, Jazz…" />
              </div>

              {/* Labels */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1.5">
                  Labels
                  {enriching && <span className="text-zinc-600 text-[10px]">fetching…</span>}
                </label>
                <ChipInput values={labels} onChange={setLabels} suggestions={allLabels} placeholder="e.g. Sub Pop, XL…" />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Tags <span className="text-zinc-600">(styles, moods, etc.)</span></label>
                <ChipInput values={tags} onChange={setTags} suggestions={allTags} placeholder="e.g. Indie, Shoegaze…" />
              </div>

              {postError && <p className="text-red-400 text-xs">{postError}</p>}
            </div>

            {/* Submit */}
            <div className="sticky bottom-0 px-5 pb-5 pt-3 bg-zinc-950 border-t border-zinc-900">
              <button
                onClick={handlePost}
                disabled={posting || !user}
                className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {posting ? "Posting…" : "Post to Flockify"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
