import { buildPublicUploadUrl } from './uploads.js'
import type { UserGender } from '../types/user.js'

export interface PublicMemberRow {
  id: string
  full_name: string
  nickname: string
  avatar_path: string | null
  show_full_name: boolean
  show_nickname: boolean
  city?: string | null
  show_city?: boolean
  gender?: UserGender
  show_gender?: boolean
  date_of_birth?: Date | string | null
  show_date_of_birth?: boolean
}

/** Thin snippet for feed / marketplace / friend lists. */
export interface PublicMember {
  id: number
  displayName: string
  avatarUrl: string | null
}

/** Privacy-aware public profile fields for member pages and discovery. */
export interface PublicMemberProfile extends PublicMember {
  city: string | null
  gender: UserGender | null
  ageYears: number | null
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

export function ageYearsFromDob(dateOfBirth: Date | string, now = new Date()): number {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) {
    return 0
  }
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1
  }
  return Math.max(0, age)
}

export function mapPublicMember(row: PublicMemberRow): PublicMember {
  return {
    id: Number(row.id),
    displayName: resolvePublicDisplayName(row),
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
  }
}

export function mapPublicMemberProfile(row: PublicMemberRow): PublicMemberProfile {
  const base = mapPublicMember(row)
  const city =
    row.show_city && typeof row.city === 'string' && row.city.trim()
      ? row.city.trim()
      : null
  const gender = row.show_gender && row.gender ? row.gender : null
  const ageYears =
    row.show_date_of_birth && row.date_of_birth
      ? ageYearsFromDob(row.date_of_birth)
      : null
  return {
    ...base,
    city,
    gender,
    ageYears,
  }
}
