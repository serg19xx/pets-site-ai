export const USER_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const

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
  /** IANA timezone; null until auto-synced from the browser. */
  timezone: string | null
}
export const GENDER_LABELS: Record<UserGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

/** Site display name: nickname if set, otherwise full name. */
export function resolveDisplayName(fullName: string, nickname: string): string {
  const nick = nickname.trim()
  return nick || fullName.trim()
}
