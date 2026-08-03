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
    greetingFr: { type: ['string', 'null'] },
    weightKg: { type: ['number', 'null'] },
    color: { type: ['string', 'null'] },
    lengthCm: { type: ['number', 'null'] },
    heightCm: { type: ['number', 'null'] },
    markings: { type: ['string', 'null'] },
    physicalNotes: { type: ['string', 'null'] },
    pedigreeNotes: { type: ['string', 'null'] },
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
    'greetingFr',
    'weightKg',
    'color',
    'lengthCm',
    'heightCm',
    'markings',
    'physicalNotes',
    'pedigreeNotes',
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
    weightKg: { type: ['number', 'null'], minimum: 0 },
    color: { type: ['string', 'null'], maxLength: 120 },
    lengthCm: { type: ['number', 'null'], minimum: 0 },
    heightCm: { type: ['number', 'null'], minimum: 0 },
    markings: { type: ['string', 'null'], maxLength: 500 },
    physicalNotes: { type: ['string', 'null'], maxLength: 2000 },
    pedigreeNotes: { type: ['string', 'null'], maxLength: 2000 },
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

const linkedPetSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    speciesLabel: { type: 'string' },
    breedLabel: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    ownerUserId: { type: 'integer' },
    publicPath: { type: 'string' },
  },
  required: [
    'id',
    'name',
    'speciesLabel',
    'breedLabel',
    'avatarUrl',
    'ownerUserId',
    'publicPath',
  ],
} as const

export const petParentRecordSchema = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ['dam', 'sire'] },
    source: { type: 'string', enum: ['owned_pet', 'site_pet', 'external'] },
    linkedPet: { anyOf: [linkedPetSummarySchema, { type: 'null' }] },
    name: { type: ['string', 'null'] },
    breedLabel: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    photoUrl: { type: ['string', 'null'] },
  },
  required: ['role', 'source', 'linkedPet', 'name', 'breedLabel', 'notes', 'photoUrl'],
} as const

export const petParentsResponseSchema = {
  type: 'object',
  properties: {
    dam: { anyOf: [petParentRecordSchema, { type: 'null' }] },
    sire: { anyOf: [petParentRecordSchema, { type: 'null' }] },
  },
  required: ['dam', 'sire'],
} as const

const upsertParentBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source'],
  properties: {
    source: { type: 'string', enum: ['owned_pet', 'site_pet', 'external'] },
    linkedPetId: { type: ['integer', 'null'], minimum: 1 },
    name: { type: ['string', 'null'], maxLength: 200 },
    breedLabel: { type: ['string', 'null'], maxLength: 200 },
    notes: { type: ['string', 'null'], maxLength: 2000 },
  },
} as const

export const setPetParentsBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dam: { anyOf: [upsertParentBodySchema, { type: 'null' }] },
    sire: { anyOf: [upsertParentBodySchema, { type: 'null' }] },
  },
} as const

export const petParentSingleResponseSchema = {
  type: 'object',
  properties: {
    parent: petParentRecordSchema,
  },
  required: ['parent'],
} as const

const parentCandidateSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    speciesLabel: { type: 'string' },
    breedLabel: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    scope: { type: 'string', enum: ['owned', 'site'] },
  },
  required: ['id', 'name', 'speciesLabel', 'breedLabel', 'avatarUrl', 'scope'],
} as const

export const parentCandidatesResponseSchema = {
  type: 'object',
  properties: {
    owned: { type: 'array', items: parentCandidateSchema },
    site: { type: 'array', items: parentCandidateSchema },
  },
  required: ['owned', 'site'],
} as const

export const petCertificateSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    url: { type: 'string' },
    sortOrder: { type: 'integer' },
    createdAt: { type: 'string' },
  },
  required: ['id', 'url', 'sortOrder', 'createdAt'],
} as const

export const petCertificatesListResponseSchema = {
  type: 'object',
  properties: {
    certificates: { type: 'array', items: petCertificateSchema },
  },
  required: ['certificates'],
} as const

export const petCertificateSingleResponseSchema = {
  type: 'object',
  properties: {
    certificate: petCertificateSchema,
  },
  required: ['certificate'],
} as const

export const petMedicalPhotoSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    url: { type: 'string' },
    sortOrder: { type: 'integer' },
    createdAt: { type: 'string' },
  },
  required: ['id', 'url', 'sortOrder', 'createdAt'],
} as const

export const petMedicalRecordSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    visitedOn: { type: 'string' },
    clinicName: { type: ['string', 'null'] },
    doctorName: { type: ['string', 'null'] },
    procedureLabel: { type: 'string' },
    notes: { type: ['string', 'null'] },
    photos: { type: 'array', items: petMedicalPhotoSchema },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: [
    'id',
    'visitedOn',
    'clinicName',
    'doctorName',
    'procedureLabel',
    'notes',
    'photos',
    'createdAt',
    'updatedAt',
  ],
} as const

export const petMedicalRecordsListResponseSchema = {
  type: 'object',
  properties: {
    records: { type: 'array', items: petMedicalRecordSchema },
  },
  required: ['records'],
} as const

export const petMedicalRecordSingleResponseSchema = {
  type: 'object',
  properties: {
    record: petMedicalRecordSchema,
  },
  required: ['record'],
} as const

export const upsertPetMedicalRecordBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['visitedOn', 'procedureLabel'],
  properties: {
    visitedOn: { type: 'string', format: 'date' },
    clinicName: { type: ['string', 'null'], maxLength: 200 },
    doctorName: { type: ['string', 'null'], maxLength: 200 },
    procedureLabel: { type: 'string', minLength: 1, maxLength: 300 },
    notes: { type: ['string', 'null'], maxLength: 2000 },
  },
} as const

export const petMedicalPhotoSingleResponseSchema = {
  type: 'object',
  properties: {
    photo: petMedicalPhotoSchema,
  },
  required: ['photo'],
} as const
