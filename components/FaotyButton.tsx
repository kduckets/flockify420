"use client";

import { useState } from "react";
import { FaotyModal } from "./FaotyModal";
import type { Album } from "@/types";

export function FaotyButton({ albums }: { albums: Album[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="FAOTY — Flockify Album of the Year"
        title="FAOTY — Flockify Album of the Year"
        className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-zinc-500"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/>
          <path d="M6 4h12v10a6 6 0 0 1-6 6 6 6 0 0 1-6-6V4Z"/>
          <path d="M9 20h6"/>
          <path d="M12 20v2"/>
        </svg>
      </button>
      {open && <FaotyModal albums={albums} onClose={() => setOpen(false)} />}
    </>
  );
}
