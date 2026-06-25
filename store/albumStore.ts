'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GifComment } from '@/types'

// vote values: -1 = downvote, 1 = upvote, 2 = star (counts as 2 upvotes)
export type VoteValue = -1 | 1 | 2

interface AlbumStore {
  votes: Partial<Record<string, VoteValue>>
  comments: Record<string, GifComment[]>
  favoritedAlbums: string[]
  setVote: (albumId: string, vote: VoteValue | 0) => void
  loadVotes: (incoming: Record<string, VoteValue>) => void
  setComments: (albumId: string, comments: GifComment[]) => void
  addComment: (albumId: string, comment: GifComment) => void
  removeComment: (albumId: string, commentId: string) => void
  toggleFavorited: (albumId: string) => void
  loadFavorited: (albumIds: string[]) => void
}

export const useAlbumStore = create<AlbumStore>()(
  persist(
    (set) => ({
      votes: {} as Partial<Record<string, VoteValue>>,
      comments: {},
      favoritedAlbums: [],
      setVote: (albumId, vote) =>
        set((state) => {
          const next = { ...state.votes }
          if (vote === 0) delete next[albumId]
          else next[albumId] = vote
          return { votes: next }
        }),
      loadVotes: (incoming) =>
        set((state) => ({ votes: { ...state.votes, ...incoming } })),
      setComments: (albumId, comments) =>
        set((state) => ({
          comments: { ...state.comments, [albumId]: comments },
        })),
      addComment: (albumId, comment) =>
        set((state) => ({
          comments: {
            ...state.comments,
            [albumId]: [...(state.comments[albumId] ?? []), comment],
          },
        })),
      removeComment: (albumId, commentId) =>
        set((state) => ({
          comments: {
            ...state.comments,
            [albumId]: (state.comments[albumId] ?? []).filter((c) => c.id !== commentId),
          },
        })),
      toggleFavorited: (albumId) =>
        set((state) => ({
          favoritedAlbums: state.favoritedAlbums.includes(albumId)
            ? state.favoritedAlbums.filter((id) => id !== albumId)
            : [...state.favoritedAlbums, albumId],
        })),
      loadFavorited: (albumIds) =>
        set(() => ({ favoritedAlbums: albumIds })),
    }),
    { name: 'flockify420-store' }
  )
)
