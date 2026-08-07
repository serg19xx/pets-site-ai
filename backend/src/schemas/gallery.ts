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
    greetingFr: { type: ['string', 'null'] },
    coverCaption: { type: ['string', 'null'] },
    coverCaptionFr: { type: ['string', 'null'] },
    latestVoice: { type: ['string', 'null'] },
    latestVoiceFr: { type: ['string', 'null'] },
    latestVoiceTemplate: { type: ['string', 'null'] },
    virtualLifeEnabled: { type: 'boolean' },
    liked: { type: 'boolean' },
    likeCount: { type: 'integer' },
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          url: { type: 'string' },
          caption: { type: ['string', 'null'] },
          captionFr: { type: ['string', 'null'] },
        },
        required: ['id', 'url', 'caption', 'captionFr'],
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
    'greetingFr',
    'coverCaption',
    'coverCaptionFr',
    'latestVoice',
    'latestVoiceFr',
    'latestVoiceTemplate',
    'virtualLifeEnabled',
    'liked',
    'likeCount',
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

const petFriendSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
    species: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['slug', 'label'],
    },
  },
  required: ['id', 'name', 'avatarUrl', 'species'],
} as const

const petFriendExchangeLineSchema = {
  type: 'object',
  properties: {
    speakerPetId: { type: 'integer' },
    speakerName: { type: 'string' },
    turn: { type: 'integer' },
    body: { type: 'string' },
    bodyFr: { type: 'string' },
    createdAt: { type: 'string' },
  },
  required: [
    'speakerPetId',
    'speakerName',
    'turn',
    'body',
    'bodyFr',
    'createdAt',
  ],
} as const

const petFriendExchangeSchema = {
  type: 'object',
  properties: {
    friend: petFriendSummarySchema,
    lines: { type: 'array', items: petFriendExchangeLineSchema },
  },
  required: ['friend', 'lines'],
} as const

const galleryPetDetailSchema = {
  type: 'object',
  properties: {
    ...galleryPetItemSchema.properties,
    member: publicMemberSchema,
    friends: { type: 'array', items: petFriendSummarySchema },
    friendExchanges: { type: 'array', items: petFriendExchangeSchema },
  },
  required: [
    ...galleryPetItemSchema.required,
    'member',
    'friends',
    'friendExchanges',
  ],
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
