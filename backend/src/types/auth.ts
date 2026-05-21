import type { UserProfile } from './user.js'

export interface AuthSession {
  accessToken: string
  user: UserProfile
  mustChangePassword: boolean
}

export interface JwtPayload {
  sub: number
  email: string
}
