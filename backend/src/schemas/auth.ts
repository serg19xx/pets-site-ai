import { USER_GENDERS } from '../types/user.js'

const genderEnum = { type: 'string', enum: [...USER_GENDERS] }

export const registerBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fullName', 'gender', 'dateOfBirth', 'email'],
  properties: {
    fullName: { type: 'string', minLength: 1, maxLength: 200 },
    nickname: { type: 'string', maxLength: 100 },
    gender: genderEnum,
    dateOfBirth: { type: 'string', format: 'date' },
    phone: { type: 'string', maxLength: 32 },
    email: { type: 'string', format: 'email', maxLength: 320 },
    betaInvite: { type: 'string', minLength: 8, maxLength: 128 },
  },
} as const

export const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
    password: { type: 'string', minLength: 1, maxLength: 128 },
    /** admin = operator console; member (default) = main Pet Friends site */
    audience: { type: 'string', enum: ['admin', 'member'] },
  },
} as const

export const changePasswordBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['newPassword'],
  properties: {
    currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
    newPassword: { type: 'string', minLength: 8, maxLength: 128 },
  },
} as const

export const forgotPasswordBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
  },
} as const

export const tokenBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['token'],
  properties: {
    token: { type: 'string', minLength: 16, maxLength: 512 },
  },
} as const

const profilePrivacyProperties = {
  showFullName: { type: 'boolean' },
  showNickname: { type: 'boolean' },
  showEmail: { type: 'boolean' },
  showPhone: { type: 'boolean' },
  showGender: { type: 'boolean' },
  showDateOfBirth: { type: 'boolean' },
} as const

export const publicUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    fullName: { type: 'string' },
    nickname: { type: 'string' },
    email: { type: 'string' },
    gender: genderEnum,
    dateOfBirth: { type: 'string', format: 'date' },
    phone: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    isBetaTester: { type: 'boolean' },
    isAdmin: { type: 'boolean' },
  },
  required: [
    'id',
    'fullName',
    'nickname',
    'email',
    'gender',
    'dateOfBirth',
    'phone',
    'avatarUrl',
    'isBetaTester',
    'isAdmin',
  ],
} as const

export const userProfileSchema = {
  type: 'object',
  properties: {
    ...publicUserSchema.properties,
    timezone: { type: ['string', 'null'] },
    ...profilePrivacyProperties,
  },
  required: [
    ...publicUserSchema.required,
    'timezone',
    'showFullName',
    'showNickname',
    'showEmail',
    'showPhone',
    'showGender',
    'showDateOfBirth',
  ],
} as const

export const updateTimezoneBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['timezone'],
  properties: {
    timezone: { type: 'string', minLength: 1, maxLength: 64 },
  },
} as const

export const betaJoinBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['betaInvite', 'acceptedTerms'],
  properties: {
    betaInvite: { type: 'string', minLength: 8, maxLength: 128 },
    acceptedTerms: { type: 'boolean' },
  },
} as const

export const betaStatusResponseSchema = {
  type: 'object',
  properties: {
    acceptedCount: { type: 'integer' },
    capacity: { type: 'integer' },
    open: { type: 'boolean' },
    inviteToken: { type: 'string' },
  },
  required: ['acceptedCount', 'capacity', 'open', 'inviteToken'],
} as const

export const betaJoinResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    isBetaTester: { type: 'boolean' },
  },
  required: ['message', 'isBetaTester'],
} as const

export const updateProfileBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'fullName',
    'gender',
    'dateOfBirth',
    'showFullName',
    'showNickname',
    'showEmail',
    'showPhone',
    'showGender',
    'showDateOfBirth',
  ],
  properties: {
    fullName: { type: 'string', minLength: 1, maxLength: 200 },
    nickname: { type: 'string', maxLength: 100 },
    gender: genderEnum,
    dateOfBirth: { type: 'string', format: 'date' },
    phone: { type: 'string', maxLength: 32 },
    ...profilePrivacyProperties,
  },
} as const

export const profileResponseSchema = {
  type: 'object',
  properties: {
    user: userProfileSchema,
  },
  required: ['user'],
} as const

export const messageResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
  required: ['message'],
} as const

export const authSessionSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    mustChangePassword: { type: 'boolean' },
    user: userProfileSchema,
  },
  required: ['accessToken', 'mustChangePassword', 'user'],
} as const

export const sessionUserSchema = {
  type: 'object',
  properties: {
    mustChangePassword: { type: 'boolean' },
    user: userProfileSchema,
  },
  required: ['mustChangePassword', 'user'],
} as const

export const errorResponseSchema = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['code', 'message'],
} as const
