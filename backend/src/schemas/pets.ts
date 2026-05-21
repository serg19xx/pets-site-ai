import { PET_SEXES } from '../types/pet.js'

const petSexEnum = { type: 'string', enum: [...PET_SEXES] }

export const petSpeciesRefSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    slug: { type: 'string' },
    label: { type: 'string' },
  },
  required: ['id', 'slug', 'label'],
} as const

export const petBreedRefSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    label: { type: 'string' },
  },
  required: ['id', 'label'],
} as const

export const petResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    name: { type: 'string' },
    species: petSpeciesRefSchema,
    breed: { anyOf: [petBreedRefSchema, { type: 'null' }] },
    dateOfBirth: { type: 'string', format: 'date' },
    sex: petSexEnum,
    avatarUrl: { type: ['string', 'null'] },
    coverPhotoId: { type: ['integer', 'null'] },
    description: { type: ['string', 'null'] },
    greeting: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: [
    'id',
    'userId',
    'name',
    'species',
    'breed',
    'dateOfBirth',
    'sex',
    'avatarUrl',
    'coverPhotoId',
    'description',
    'greeting',
    'createdAt',
    'updatedAt',
  ],
} as const

export const petSpeciesListItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    slug: { type: 'string' },
    label: { type: 'string' },
  },
  required: ['id', 'slug', 'label'],
} as const

export const petBreedListItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    label: { type: 'string' },
  },
  required: ['id', 'label'],
} as const

export const createPetBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'speciesId', 'dateOfBirth', 'sex'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    speciesId: { type: 'integer', minimum: 1 },
    breedId: { type: ['integer', 'null'], minimum: 1 },
    dateOfBirth: { type: 'string', format: 'date' },
    sex: petSexEnum,
    description: { type: ['string', 'null'], maxLength: 2000 },
  },
} as const

export const updatePetBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    speciesId: { type: 'integer', minimum: 1 },
    breedId: { type: ['integer', 'null'], minimum: 1 },
    dateOfBirth: { type: 'string', format: 'date' },
    sex: petSexEnum,
    description: { type: ['string', 'null'], maxLength: 2000 },
  },
} as const

export const speciesListResponseSchema = {
  type: 'object',
  properties: {
    species: { type: 'array', items: petSpeciesListItemSchema },
  },
  required: ['species'],
} as const

export const breedsListResponseSchema = {
  type: 'object',
  properties: {
    breeds: { type: 'array', items: petBreedListItemSchema },
  },
  required: ['breeds'],
} as const

export const petsListResponseSchema = {
  type: 'object',
  properties: {
    pets: { type: 'array', items: petResponseSchema },
  },
  required: ['pets'],
} as const

export const petSingleResponseSchema = {
  type: 'object',
  properties: {
    pet: petResponseSchema,
  },
  required: ['pet'],
} as const

export const petPhotoSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    url: { type: 'string' },
    sortOrder: { type: 'integer' },
    createdAt: { type: 'string' },
    isCover: { type: 'boolean' },
  },
  required: ['id', 'url', 'sortOrder', 'createdAt', 'isCover'],
} as const

export const setPetCoverBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['photoId'],
  properties: {
    photoId: { type: 'integer', minimum: 1 },
  },
} as const

export const petPhotosListResponseSchema = {
  type: 'object',
  properties: {
    photos: { type: 'array', items: petPhotoSchema },
  },
  required: ['photos'],
} as const

export const petPhotoSingleResponseSchema = {
  type: 'object',
  properties: {
    photo: petPhotoSchema,
  },
  required: ['photo'],
} as const
