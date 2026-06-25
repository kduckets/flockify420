"use client";

import { create } from "zustand";

interface ScoresStore {
  scores: Record<string, number>;
  commentCounts: Record<string, number>;
  lastCommentAt: Record<string, number>;
  voterCounts: Record<string, number>;
  fetchScores: (albumIds: string[]) => Promise<void>;
  setScore: (albumId: string, score: number | null) => void;
  setCommentCount: (albumId: string, count: number) => void;
  setLastCommentAt: (albumId: string, ts: number) => void;
}

export const useAveragesStore = create<ScoresStore>((set) => ({
  scores: {},
  commentCounts: {},
  lastCommentAt: {},
  voterCounts: {},

  fetchScores: async (albumIds) => {
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: albumIds }),
      });
      const data = await res.json();
      set({
        scores: data.scores ?? {},
        commentCounts: data.commentCounts ?? {},
        lastCommentAt: data.lastCommentAt ?? {},
        voterCounts: data.voterCounts ?? {},
      });
    } catch { /* silently ignore */ }
  },

  setScore: (albumId, score) =>
    set((state) => {
      const next = { ...state.scores };
      if (score === null) delete next[albumId];
      else next[albumId] = score;
      return { scores: next };
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
