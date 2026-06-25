"use client";

import { useState, useRef, useEffect } from "react";
import { useAlbumStore } from "@/store/albumStore";

interface GifAddModalProps {
  albumId: string;
  onClose: () => void;
}

export function GifAddModal({ albumId, onClose }: GifAddModalProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const addComment = useAlbumStore((s) => s.addComment);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handlePreview() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a GIF URL");
      return;
    }
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "https:") {
        setError("URL must use HTTPS");
        return;
      }
    } catch {
      setError("Please enter a valid URL");
      return;
    }
    setError("");
    setImgError(false);
    setPreview(trimmed);
  }

  function handleSubmit() {
    if (!preview || imgError) {
      if (!preview) handlePreview();
      return;
    }
    addComment(albumId, {
      id: crypto.randomUUID(),
      albumId,
      gifUrl: preview,
      timestamp: Date.now(),
      author: "",
      visitorId: "",
    });
    onClose();
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Add a GIF Reaction</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
          Find a GIF on{" "}
          <a
            href="https://giphy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline"
          >
            GIPHY
          </a>{" "}
          or{" "}
          <a
            href="https://tenor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline"
          >
            Tenor
          </a>
          , copy the image link, and paste it below.
        </p>

        <div className="flex gap-2 mb-2">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePreview()}
            placeholder="https://media.giphy.com/..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button
            onClick={handlePreview}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors cursor-pointer flex-shrink-0"
          >
            Preview
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        {preview && (
          <div className="mb-3 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
            {imgError ? (
              <div className="p-4 text-center text-sm text-zinc-400">
                Could not load this GIF. Check the URL and try again.
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="GIF preview"
                className="w-full max-h-60 object-contain"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!preview || imgError}
            className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Post GIF
          </button>
        </div>
      </div>
    </div>
  );
}
