export interface Album {
  id: string
  title: string
  artist: string
  year: number
  artworkUrl: string
  spotifyUri: string
  description?: string
  labels: string[]
  genre: string[]
  tags: string[]
  creatorName: string
  userId?: string
  createdTs: string
  postOrder: number
  legacyScore: number
  legacyStars: number
}

export interface GifComment {
  id: string
  albumId: string
  gifUrl: string
  timestamp: number
  author: string
  visitorId: string
}

export type SortOrder = 'new' | 'top' | 'comments'
