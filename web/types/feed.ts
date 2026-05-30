import type { PublicMember } from '~/types/public-member'

export interface FeedPostMedia {
  id: number
  kind: 'image' | 'video'
  url: string
  sortOrder: number
}

export interface FeedPost {
  id: number
  body: string | null
  createdAt: string
  updatedAt: string
  author: PublicMember
  media: FeedPostMedia[]
  likeCount: number
  commentCount: number
  liked: boolean
  saved: boolean
}

export interface FeedComment {
  id: number
  body: string
  createdAt: string
  author: PublicMember
}

export interface PostEngagement {
  liked: boolean
  likeCount: number
  saved: boolean
}
