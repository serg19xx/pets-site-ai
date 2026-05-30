import { buildPublicUploadUrl } from './uploads.js'
import {
  mapPublicMember,
  type PublicMember,
  type PublicMemberRow,
} from './map-public-member.js'

export interface PostMediaRow {
  id: string
  post_id: string
  kind: string
  path: string
  sort_order: number
}

export interface FeedPostRow {
  id: string
  user_id: string
  body: string | null
  created_at: Date
  updated_at: Date
  full_name: string
  nickname: string
  avatar_path: string | null
  show_full_name: boolean
  show_nickname: boolean
  like_count: string
  comment_count: string
  liked: boolean | null
  saved: boolean | null
}

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

export interface FeedCommentRow {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: Date
  full_name: string
  nickname: string
  avatar_path: string | null
  show_full_name: boolean
  show_nickname: boolean
}

export interface FeedComment {
  id: number
  body: string
  createdAt: string
  author: PublicMember
}

function mapPostMediaRow(row: PostMediaRow): FeedPostMedia {
  return {
    id: Number(row.id),
    kind: row.kind as 'image' | 'video',
    url: buildPublicUploadUrl(row.path),
    sortOrder: row.sort_order,
  }
}

export function mapFeedPostRow(
  row: FeedPostRow,
  mediaRows: PostMediaRow[],
): FeedPost {
  const authorRow: PublicMemberRow = {
    id: row.user_id,
    full_name: row.full_name,
    nickname: row.nickname,
    avatar_path: row.avatar_path,
    show_full_name: row.show_full_name,
    show_nickname: row.show_nickname,
  }

  return {
    id: Number(row.id),
    body: row.body,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: mapPublicMember(authorRow),
    media: mediaRows.map(mapPostMediaRow),
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    liked: row.liked === true,
    saved: row.saved === true,
  }
}

export function mapFeedCommentRow(row: FeedCommentRow): FeedComment {
  const authorRow: PublicMemberRow = {
    id: row.user_id,
    full_name: row.full_name,
    nickname: row.nickname,
    avatar_path: row.avatar_path,
    show_full_name: row.show_full_name,
    show_nickname: row.show_nickname,
  }

  return {
    id: Number(row.id),
    body: row.body,
    createdAt: row.created_at.toISOString(),
    author: mapPublicMember(authorRow),
  }
}
