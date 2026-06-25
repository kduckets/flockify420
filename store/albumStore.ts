'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GifComment } from '@/types'

interface AlbumStore {
  ratings: Record<string, number>
  comments: Record<string, GifComment[]>
  favoritedAlbums: string[]
  setRating: (albumId: string, rating: number) => void
  loadRatings: (incoming: Record<string, number>) => void
  setComments: (albumId: string, comments: GifComment[]) => void
  addComment: (albumId: string, comment: GifComment) => void
  removeComment: (albumId: string, commentId: string) => void
  toggleFavorited: (albumId: string) => void
  loadFavorited: (albumIds: string[]) => void
}

export const useAlbumStore = create<AlbumStore>()(
  persist(
    (set) => ({
      ratings: {},
      comments: {},
      favoritedAlbums: [],
      setRating: (albumId, rating) =>
        set((state) => {
          const newRatings = { ...state.ratings }
          if (rating === 0) delete newRatings[albumId]
          else newRatings[albumId] = rating
          return { ratings: newRatings }
        }),
      loadRatings: (incoming) =>
        set((state) => ({ ratings: { ...state.ratings, ...incoming } })),
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
    { name: 'album-rater-store' }
  )
)
