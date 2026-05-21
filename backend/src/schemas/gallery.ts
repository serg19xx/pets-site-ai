const petSexEnum = { type: 'string', enum: ['male', 'female', 'unknown'] }

export const publicMemberSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    displayName: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
  },
  required: ['id', 'displayName', 'avatarUrl'],
} as const

const galleryPetItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    species: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['slug', 'label'],
    },
    breed: {
      anyOf: [
        {
          type: 'object',
          properties: { label: { type: 'string' } },
          required: ['label'],
        },
        { type: 'null' },
      ],
    },
    dateOfBirth: { type: 'string', format: 'date' },
    sex: petSexEnum,
    avatarUrl: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    greeting: { type: ['string', 'null'] },
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          url: { type: 'string' },
        },
        required: ['id', 'url'],
      },
    },
  },
  required: [
    'id',
    'name',
    'species',
    'breed',
    'dateOfBirth',
    'sex',
    'avatarUrl',
    'description',
    'greeting',
    'photos',
  ],
} as const

export const galleryPetsResponseSchema = {
  type: 'object',
  properties: {
    pets: { type: 'array', items: galleryPetItemSchema },
    total: { type: 'integer' },
  },
  required: ['pets', 'total'],
} as const

const galleryPetDetailSchema = {
  type: 'object',
  properties: {
    ...galleryPetItemSchema.properties,
    member: publicMemberSchema,
  },
  required: [...galleryPetItemSchema.required, 'member'],
} as const

export const galleryPetResponseSchema = {
  type: 'object',
  properties: {
    pet: galleryPetDetailSchema,
  },
  required: ['pet'],
} as const

export const galleryMemberResponseSchema = {
  type: 'object',
  properties: {
    member: publicMemberSchema,
    pets: { type: 'array', items: galleryPetItemSchema },
  },
  required: ['member', 'pets'],
} as const
