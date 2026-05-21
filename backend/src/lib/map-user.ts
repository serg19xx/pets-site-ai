import { buildPublicUploadUrl } from './uploads.js'
import type { PublicUser, UserGender, UserProfile } from '../types/user.js'

type UserRow = {
  id: string
  full_name: string
  nickname: string
  email: string
  gender: UserGender
  date_of_birth: Date
  phone: string | null
  avatar_path?: string | null
}

type ProfileRow = UserRow & {
  show_full_name: boolean
  show_nickname: boolean
  show_email: boolean
  show_phone: boolean
  show_gender: boolean
  show_date_of_birth: boolean
}

function formatDateOfBirth(dateOfBirth: Date): string {
  return dateOfBirth instanceof Date
    ? dateOfBirth.toISOString().slice(0, 10)
    : String(dateOfBirth).slice(0, 10)
}

function mapAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) {
    return null
  }
  return buildPublicUploadUrl(avatarPath)
}

export function mapUserRow(row: UserRow): PublicUser {
  return {
    id: Number(row.id),
    fullName: row.full_name,
    nickname: row.nickname,
    email: row.email,
    gender: row.gender,
    dateOfBirth: formatDateOfBirth(row.date_of_birth),
    phone: row.phone,
    avatarUrl: mapAvatarUrl(row.avatar_path),
  }
}

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    ...mapUserRow(row),
    showFullName: row.show_full_name,
    showNickname: row.show_nickname,
    showEmail: row.show_email,
    showPhone: row.show_phone,
    showGender: row.show_gender,
    showDateOfBirth: row.show_date_of_birth,
  }
}

export const PROFILE_SELECT = `
  u.id, u.full_name, u.nickname, u.email, u.gender, u.date_of_birth, u.phone, u.avatar_path,
  u.show_full_name, u.show_nickname, u.show_email, u.show_phone,
  u.show_gender, u.show_date_of_birth
`

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeNickname(nickname: string | undefined, fullName: string): string {
  const trimmed = nickname?.trim()
  if (trimmed) {
    return trimmed
  }
  return fullName.trim().split(/\s+/)[0] || 'User'
}
