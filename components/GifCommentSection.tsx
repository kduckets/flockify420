"use client";

import { useState } from "react";
import { useAlbumStore } from "@/store/albumStore";
import { GifAddModal } from "./GifAddModal";

interface GifCommentSectionProps {
  albumId: string;
}

export function GifCommentSection({ albumId }: GifCommentSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const comments = useAlbumStore((s) => s.comments[albumId] ?? []);
  const removeComment = useAlbumStore((s) => s.removeComment);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-zinc-300">
          GIF Reactions ({comments.length})
        </h3>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs font-medium transition-colors cursor-pointer"
        >
          + Add GIF
        </button>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <p className="text-2xl mb-2">🎷</p>
          <p className="text-sm">No reactions yet. Be the first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="relative group rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.gifUrl}
                alt="GIF reaction"
                className="w-full aspect-video object-cover"
              />
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs text-zinc-500">
                  {new Date(comment.timestamp).toLocaleDateString()}
                </p>
                <button
                  onClick={() => removeComment(albumId, comment.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <GifAddModal albumId={albumId} onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}
