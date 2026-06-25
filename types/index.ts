export type AlbumType = 'studio' | 'live' | 'compilation'

export interface Album {
  id: string
  title: string
  year: number
  batchId: string
  artworkUrl: string
  label?: string
  type: AlbumType
  description?: string
  postOrder?: number
}

export interface Batch {
  id: string
  name: string
  description: string
  albums: Album[]
}

export interface GifComment {
  id: string
  albumId: string
  gifUrl: string
  timestamp: number
  author: string      // "" means anonymous
  visitorId: string   // owner identifier
}

export type SortOrder  = 'new' | 'top' | 'comments'
export type EraFilter  = 'all' | '50s' | '60s' | '70s' | '80s' | '90s' | '2000s+'
export type TypeFilter = 'all' | 'studio' | 'live' | 'compilation'
