export const USER_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const

export type UserGender = (typeof USER_GENDERS)[number]

export interface PublicUser {
  id: number
  fullName: string
  nickname: string
  email: string
  gender: UserGender
  dateOfBirth: string
  phone: string | null
  avatarUrl: string | null
  isBetaTester: boolean
  isAdmin: boolean
}

export interface ProfilePrivacy {
  showFullName: boolean
  showNickname: boolean
  showEmail: boolean
  showPhone: boolean
  showGender: boolean
  showDateOfBirth: boolean
}

export interface UserProfile extends PublicUser, ProfilePrivacy {
  /** IANA timezone; null until the client syncs it (soft-launch auto-detect). */
  timezone: string | null
}
export function resolveDisplayName(fullName: string, nickname: string): string {
  const nick = nickname.trim()
  return nick || fullName.trim()
}
