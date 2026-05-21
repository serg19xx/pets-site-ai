import { buildPublicUploadUrl } from './uploads.js'

export interface PublicMemberRow {
  id: string
  full_name: string
  nickname: string
  avatar_path: string | null
  show_full_name: boolean
  show_nickname: boolean
}

export interface PublicMember {
  id: number
  displayName: string
  avatarUrl: string | null
}

export function resolvePublicDisplayName(row: PublicMemberRow): string {
  if (row.show_nickname && row.nickname.trim()) {
    return row.nickname.trim()
  }
  if (row.show_full_name && row.full_name.trim()) {
    return row.full_name.trim()
  }
  return 'Community member'
}

export function mapPublicMember(row: PublicMemberRow): PublicMember {
  return {
    id: Number(row.id),
    displayName: resolvePublicDisplayName(row),
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
  }
}
