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
  },
} as const

export const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
    password: { type: 'string', minLength: 1, maxLength: 128 },
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
  },
  required: ['id', 'fullName', 'nickname', 'email', 'gender', 'dateOfBirth', 'phone', 'avatarUrl'],
} as const

export const userProfileSchema = {
  type: 'object',
  properties: {
    ...publicUserSchema.properties,
    ...profilePrivacyProperties,
  },
  required: [
    ...publicUserSchema.required,
    'showFullName',
    'showNickname',
    'showEmail',
    'showPhone',
    'showGender',
    'showDateOfBirth',
  ],
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
