"use client";

import { useEffect, useRef, useState } from "react";
import { getUsername, setUsername, hasSetUsername } from "@/lib/identity";
import { useAlbumStore } from "@/store/albumStore";

interface Props { albumIds: string[] }

export function UsernameButton({ albumIds }: Props) {
  const [mounted, setMounted]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [syncing, setSyncing]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const loadVotes               = useAlbumStore((s) => s.loadVotes);
  const loadFavorited           = useAlbumStore((s) => s.loadFavorited);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) { setInput(getUsername()); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  async function confirm() {
    const name = input.trim();
    setUsername(name);
    setOpen(false);

    if (name && albumIds.length) {
      setSyncing(true);
      try {
        const [votesRes, collectionRes] = await Promise.all([
          fetch("/api/my-votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: name, albumIds }),
          }),
          fetch(`/api/collection?userId=${encodeURIComponent(name)}`),
        ]);
        const votesData = await votesRes.json();
        if (votesData.votes) loadVotes(votesData.votes);
        const collectionData = await collectionRes.json();
        if (Array.isArray(collectionData.saved)) loadFavorited(collectionData.saved);
      } catch { /* fail silently */ }
      setSyncing(false);
    }
  }

  const currentName = mounted ? getUsername() : "";
  const initial     = currentName ? currentName[0].toUpperCase() : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 cursor-pointer group"
        aria-label={currentName ? `Signed in as ${currentName}` : "Set username"}
        title={currentName ? `Signed in as ${currentName}` : "Set username to sync ratings"}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
          initial
            ? "bg-amber-400 text-black group-hover:bg-amber-300"
            : "bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600"
        }`}>
          {initial ?? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </div>
        {syncing && <span className="text-zinc-600 text-[10px]">syncing…</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-base mb-1">Your username</h3>
            <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
              Use the same username on any device to sync your votes. No password needed.
            </p>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder="e.g. johndoe"
              maxLength={32}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors mb-3"
            />
            {hasSetUsername() && currentName && (
              <p className="text-zinc-600 text-xs mb-3">
                Currently signed in as <span className="text-zinc-400">{currentName}</span>
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors"
              >Cancel</button>
              <button
                onClick={confirm}
                className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded text-sm cursor-pointer transition-colors"
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
