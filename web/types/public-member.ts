import type { UserGender } from '~/types/user'

/** Thin snippet for feed / marketplace / friend lists. */
export interface PublicMember {
  id: number
  displayName: string
  avatarUrl: string | null
}

/** Privacy-aware public profile for member pages and discovery. */
export interface PublicMemberProfile extends PublicMember {
  city: string | null
  gender: UserGender | null
  ageYears: number | null
}
