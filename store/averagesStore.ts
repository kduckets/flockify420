"use client";

import { create } from "zustand";

interface AveragesStore {
  averages: Record<string, number>;
  commentCounts: Record<string, number>;
  lastCommentAt: Record<string, number>;
  raterCounts: Record<string, number>;
  fetchAverages: (albumIds: string[]) => Promise<void>;
  setAverage: (albumId: string, avg: number | null) => void;
  setCommentCount: (albumId: string, count: number) => void;
  setLastCommentAt: (albumId: string, ts: number) => void;
}

export const useAveragesStore = create<AveragesStore>((set) => ({
  averages: {},
  commentCounts: {},
  lastCommentAt: {},
  raterCounts: {},

  fetchAverages: async (albumIds) => {
    try {
      const res = await fetch("/api/averages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: albumIds }),
      });
      const data = await res.json();
      set({
        averages: data.averages ?? {},
        commentCounts: data.commentCounts ?? {},
        lastCommentAt: data.lastCommentAt ?? {},
        raterCounts: data.raterCounts ?? {},
      });
    } catch { /* silently ignore */ }
  },

  setAverage: (albumId, avg) =>
    set((state) => {
      const next = { ...state.averages };
      if (avg === null) delete next[albumId];
      else next[albumId] = avg;
      return { averages: next };
    }),

  setCommentCount: (albumId, count) =>
    set((state) => ({
      commentCounts: { ...state.commentCounts, [albumId]: count },
    })),

  setLastCommentAt: (albumId, ts) =>
    set((state) => ({
      lastCommentAt: { ...state.lastCommentAt, [albumId]: ts },
    })),
}));
