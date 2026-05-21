import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { parseGreetingLocale } from '../lib/generate-pet-greeting.js'
import { getUserId } from '../plugins/jwt-auth.js'
import {
  breedsListResponseSchema,
  createPetBodySchema,
  petSingleResponseSchema,
  petPhotoSingleResponseSchema,
  petPhotosListResponseSchema,
  petsListResponseSchema,
  setPetCoverBodySchema,
  speciesListResponseSchema,
  updatePetBodySchema,
} from '../schemas/pets.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { listBreedsForSpecies, listPetSpecies } from '../services/pet-catalog.js'
import {
  createPet,
  deletePet,
  getPetById,
  listPets,
  updatePet,
} from '../services/pets.js'
import {
  deletePetPhoto,
  listPetPhotosForOwner,
  replacePetPhotoFile,
  setPetCoverPhoto,
  uploadPetPhoto,
} from '../services/pet-photos.js'
import { isPetSex, type PetSex } from '../types/pet.js'

function parseIdParam(value: string, label: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, `Invalid ${label}`, 'VALIDATION_ERROR')
  }
  return n
}

interface CreatePetBody {
  name: string
  speciesId: number
  breedId?: number | null
  dateOfBirth: string
  sex: string
  description?: string | null
}

interface UpdatePetBody {
  name?: string
  speciesId?: number
  breedId?: number | null
  dateOfBirth?: string
  sex?: string
  description?: string | null
}

export const petsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/pets/species',
    {
      schema: {
        tags: ['pets'],
        summary: 'List animal species',
        response: {
          200: speciesListResponseSchema,
        },
      },
    },
    async () => {
      const species = await listPetSpecies()
      return { species }
    },
  )

  app.get<{ Params: { speciesId: string } }>(
    '/pets/species/:speciesId/breeds',
    {
      schema: {
        tags: ['pets'],
        summary: 'List breeds for a species',
        params: {
          type: 'object',
          required: ['speciesId'],
          properties: { speciesId: { type: 'string' } },
        },
        response: {
          200: breedsListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const speciesId = parseIdParam(request.params.speciesId, 'species id')
      const breeds = await listBreedsForSpecies(speciesId)
      return { breeds }
    },
  )

  app.get(
    '/pets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List current user’s pets',
        security: [{ bearerAuth: [] }],
        response: {
          200: petsListResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const pets = await listPets(getUserId(request))
      return { pets }
    },
  )

  app.post<{ Body: CreatePetBody }>(
    '/pets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Create a pet',
        security: [{ bearerAuth: [] }],
        body: createPetBodySchema,
        response: {
          200: petSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body
      if (!isPetSex(body.sex)) {
        throw new AppError(400, 'Invalid sex', 'VALIDATION_ERROR')
      }
      const pet = await createPet(getUserId(request), {
        name: body.name,
        speciesId: body.speciesId,
        breedId: body.breedId ?? null,
        dateOfBirth: body.dateOfBirth,
        sex: body.sex,
        description: body.description,
        greetingLocale: parseGreetingLocale(request.headers['accept-language']),
      })
      return { pet }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Get a pet by id',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petSingleResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const pet = await getPetById(getUserId(request), petId)
      return { pet }
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdatePetBody }>(
    '/pets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Update a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: updatePetBodySchema,
        response: {
          200: petSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const body = request.body
      let sex: PetSex | undefined
      if (body.sex !== undefined) {
        if (!isPetSex(body.sex)) {
          throw new AppError(400, 'Invalid sex', 'VALIDATION_ERROR')
        }
        sex = body.sex
      }
      const pet = await updatePet(getUserId(request), petId, {
        name: body.name,
        speciesId: body.speciesId,
        breedId: body.breedId,
        dateOfBirth: body.dateOfBirth,
        sex,
        description: body.description,
        greetingLocale: parseGreetingLocale(request.headers['accept-language']),
      })
      return { pet }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/pets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          204: { type: 'null', description: 'No content' },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      await deletePet(getUserId(request), petId)
      return reply.status(204).send()
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id/photos',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List gallery photos for a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petPhotosListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const photos = await listPetPhotosForOwner(getUserId(request), petId)
      return { photos }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/pets/:id/photos',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Upload a gallery photo',
        description: 'Multipart form field: `file` (JPEG, PNG, WebP, GIF).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petPhotoSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const photo = await uploadPetPhoto(getUserId(request), petId, file)
      return { photo }
    },
  )

  app.delete<{ Params: { id: string; photoId: string } }>(
    '/pets/:id/photos/:photoId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete a gallery photo',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'photoId'],
          properties: {
            id: { type: 'string' },
            photoId: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null', description: 'No content' },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const photoId = parseIdParam(request.params.photoId, 'photo id')
      await deletePetPhoto(getUserId(request), petId, photoId)
      return reply.status(204).send()
    },
  )

  app.patch<{ Params: { id: string }; Body: { photoId: number } }>(
    '/pets/:id/cover-photo',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Set profile photo from gallery',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: setPetCoverBodySchema,
        response: {
          200: petSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const pet = await setPetCoverPhoto(
        getUserId(request),
        petId,
        request.body.photoId,
      )
      return { pet }
    },
  )

  app.post<{ Params: { id: string; photoId: string } }>(
    '/pets/:id/photos/:photoId/file',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Replace gallery photo file (e.g. after crop)',
        description: 'Multipart form field: `file`. Overwrites the existing file for this photo id.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id', 'photoId'],
          properties: {
            id: { type: 'string' },
            photoId: { type: 'string' },
          },
        },
        response: {
          200: petPhotoSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const photoId = parseIdParam(request.params.photoId, 'photo id')
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const photo = await replacePetPhotoFile(getUserId(request), petId, photoId, file)
      return { photo }
    },
  )
}
