import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { config } from '../config.js'
import { getUserId } from '../plugins/jwt-auth.js'
import {
  breedsListResponseSchema,
  createPetBodySchema,
  parentCandidatesResponseSchema,
  petCertificateSingleResponseSchema,
  petCertificatesListResponseSchema,
  petMedicalPhotoSingleResponseSchema,
  petMedicalRecordSingleResponseSchema,
  petMedicalRecordsListResponseSchema,
  petParentsResponseSchema,
  petParentSingleResponseSchema,
  petSingleResponseSchema,
  petPhotoSingleResponseSchema,
  petPhotosListResponseSchema,
  petsListResponseSchema,
  setPetCoverBodySchema,
  setPetParentsBodySchema,
  speciesListResponseSchema,
  updatePetBodySchema,
  upsertPetMedicalRecordBodySchema,
  petPersonalityResponseSchema,
  upsertPetPersonalityBodySchema,
  petEventsListResponseSchema,
  petMemoriesListResponseSchema,
  petGoalsListResponseSchema,
  petAiDraftsListResponseSchema,
  createPetFriendshipBodySchema,
  petFriendsListResponseSchema,
  petFriendshipSuggestionsResponseSchema,
} from '../schemas/pets.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { listBreedsForSpecies, listPetSpecies } from '../services/pet-catalog.js'
import {
  createPet,
  deletePet,
  getPetById,
  listPets,
  regeneratePetGreeting,
  updatePet,
} from '../services/pets.js'
import {
  deletePetCertificate,
  listPetCertificates,
  replacePetCertificateFile,
  uploadPetCertificate,
} from '../services/pet-certificates.js'
import {
  createPetMedicalRecord,
  deletePetMedicalPhoto,
  deletePetMedicalRecord,
  listPetMedicalRecords,
  replacePetMedicalPhotoFile,
  updatePetMedicalRecord,
  uploadPetMedicalPhoto,
  type UpsertMedicalRecordInput,
} from '../services/pet-medical.js'
import {
  deleteExternalParentPhoto,
  getPetParents,
  searchParentCandidates,
  setPetParents,
  uploadExternalParentPhoto,
  type UpsertParentInput,
} from '../services/pet-parents.js'
import {
  getPetPersonality,
  upsertPetPersonality,
  type PetPersonalityInput,
} from '../services/pet-personality.js'
import { listPetEvents } from '../services/pet-events.js'
import { listPetMemories } from '../services/pet-memories.js'
import { listPetGoals, PET_GOAL_STATUSES } from '../services/pet-goals.js'
import { listPetAiDrafts } from '../services/pet-ai-drafts.js'
import {
  createFriendship,
  deleteFriendship,
  listPetFriends,
  listPendingFriendshipSuggestions,
  generateFriendshipSuggestions,
  approveFriendshipSuggestion,
  declineFriendshipSuggestion,
} from '../services/pet-friendships.js'
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
  weightKg?: number | null
  color?: string | null
  lengthCm?: number | null
  heightCm?: number | null
  markings?: string | null
  physicalNotes?: string | null
  pedigreeNotes?: string | null
  virtualLifeEnabled?: boolean
}

interface SetPetParentsBody {
  dam?: UpsertParentInput | null
  sire?: UpsertParentInput | null
}

interface UpsertMedicalRecordBody {
  visitedOn: string
  clinicName?: string | null
  doctorName?: string | null
  procedureLabel: string
  notes?: string | null
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

  app.get<{
    Querystring: { q?: string; excludePetId?: string; limit?: string }
  }>(
    '/pets/parent-candidates',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Search pets to link as parents (owned + site)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['excludePetId'],
          properties: {
            q: { type: 'string' },
            excludePetId: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: parentCandidatesResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const excludePetId = parseIdParam(
        request.query.excludePetId ?? '',
        'excludePetId',
      )
      const limitRaw = Number(request.query.limit ?? 10)
      const limit = Number.isFinite(limitRaw) ? limitRaw : 10
      return searchParentCandidates({
        userId: getUserId(request),
        excludePetId,
        q: request.query.q ?? '',
        limit,
      })
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
        weightKg: body.weightKg,
        color: body.color,
        lengthCm: body.lengthCm,
        heightCm: body.heightCm,
        markings: body.markings,
        physicalNotes: body.physicalNotes,
        pedigreeNotes: body.pedigreeNotes,
        virtualLifeEnabled: body.virtualLifeEnabled,
      })
      return { pet }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/pets/:id/greeting/regenerate',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Regenerate pet greeting from current General-tab facts',
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
      if (!config.greetingRegenerateEnabled) {
        throw new AppError(
          403,
          'Greeting regenerate is disabled',
          'GREETING_REGENERATE_DISABLED',
        )
      }
      const petId = parseIdParam(request.params.id, 'pet id')
      const pet = await regeneratePetGreeting(getUserId(request), petId)
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
    '/pets/:id/parents',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Get dam/sire pedigree links for a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petParentsResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return getPetParents(getUserId(request), petId)
    },
  )

  app.put<{ Params: { id: string }; Body: SetPetParentsBody }>(
    '/pets/:id/parents',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Set or clear dam and/or sire',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: setPetParentsBodySchema,
        response: {
          200: petParentsResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return setPetParents(getUserId(request), petId, {
        dam: request.body.dam,
        sire: request.body.sire,
      })
    },
  )

  app.post<{ Params: { id: string; role: string } }>(
    '/pets/:id/parents/:role/photo',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Upload photo for an external parent',
        description: 'Multipart form field: `file` (JPEG, PNG, WebP, GIF).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id', 'role'],
          properties: {
            id: { type: 'string' },
            role: { type: 'string' },
          },
        },
        response: {
          200: petParentSingleResponseSchema,
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
      const buffer = await file.toBuffer()
      const parent = await uploadExternalParentPhoto(
        getUserId(request),
        petId,
        request.params.role,
        { buffer, mimetype: file.mimetype },
      )
      return { parent }
    },
  )

  app.delete<{ Params: { id: string; role: string } }>(
    '/pets/:id/parents/:role/photo',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete external parent photo',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'role'],
          properties: {
            id: { type: 'string' },
            role: { type: 'string' },
          },
        },
        response: {
          200: petParentSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const parent = await deleteExternalParentPhoto(
        getUserId(request),
        petId,
        request.params.role,
      )
      return { parent }
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

  app.get<{ Params: { id: string } }>(
    '/pets/:id/certificates',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List certificate photos for a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petCertificatesListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const certificates = await listPetCertificates(getUserId(request), petId)
      return { certificates }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/pets/:id/certificates',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Upload a certificate photo',
        description: 'Multipart form field: `file` (JPEG, PNG, WebP, GIF).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petCertificateSingleResponseSchema,
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
      const certificate = await uploadPetCertificate(getUserId(request), petId, file)
      return { certificate }
    },
  )

  app.delete<{ Params: { id: string; certificateId: string } }>(
    '/pets/:id/certificates/:certificateId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete a certificate photo',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'certificateId'],
          properties: {
            id: { type: 'string' },
            certificateId: { type: 'string' },
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
      const certificateId = parseIdParam(request.params.certificateId, 'certificate id')
      await deletePetCertificate(getUserId(request), petId, certificateId)
      return reply.status(204).send()
    },
  )

  app.post<{ Params: { id: string; certificateId: string } }>(
    '/pets/:id/certificates/:certificateId/file',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Replace certificate photo file (e.g. after crop)',
        description: 'Multipart form field: `file`. Overwrites the existing file.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id', 'certificateId'],
          properties: {
            id: { type: 'string' },
            certificateId: { type: 'string' },
          },
        },
        response: {
          200: petCertificateSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const certificateId = parseIdParam(request.params.certificateId, 'certificate id')
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const certificate = await replacePetCertificateFile(
        getUserId(request),
        petId,
        certificateId,
        file,
      )
      return { certificate }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id/medical',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List medical records for a pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petMedicalRecordsListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const records = await listPetMedicalRecords(getUserId(request), petId)
      return { records }
    },
  )

  app.post<{ Params: { id: string }; Body: UpsertMedicalRecordBody }>(
    '/pets/:id/medical',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Create a medical record',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: upsertPetMedicalRecordBodySchema,
        response: {
          200: petMedicalRecordSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const body = request.body as UpsertMedicalRecordInput
      const record = await createPetMedicalRecord(getUserId(request), petId, body)
      return { record }
    },
  )

  app.put<{
    Params: { id: string; recordId: string }
    Body: UpsertMedicalRecordBody
  }>(
    '/pets/:id/medical/:recordId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Update a medical record',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'recordId'],
          properties: {
            id: { type: 'string' },
            recordId: { type: 'string' },
          },
        },
        body: upsertPetMedicalRecordBodySchema,
        response: {
          200: petMedicalRecordSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const recordId = parseIdParam(request.params.recordId, 'record id')
      const record = await updatePetMedicalRecord(
        getUserId(request),
        petId,
        recordId,
        request.body as UpsertMedicalRecordInput,
      )
      return { record }
    },
  )

  app.delete<{ Params: { id: string; recordId: string } }>(
    '/pets/:id/medical/:recordId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete a medical record',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'recordId'],
          properties: {
            id: { type: 'string' },
            recordId: { type: 'string' },
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
      const recordId = parseIdParam(request.params.recordId, 'record id')
      await deletePetMedicalRecord(getUserId(request), petId, recordId)
      return reply.status(204).send()
    },
  )

  app.post<{ Params: { id: string; recordId: string } }>(
    '/pets/:id/medical/:recordId/photos',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Upload a proof photo for a medical record',
        description: 'Multipart form field: `file` (JPEG, PNG, WebP, GIF).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id', 'recordId'],
          properties: {
            id: { type: 'string' },
            recordId: { type: 'string' },
          },
        },
        response: {
          200: petMedicalPhotoSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const recordId = parseIdParam(request.params.recordId, 'record id')
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const photo = await uploadPetMedicalPhoto(
        getUserId(request),
        petId,
        recordId,
        file,
      )
      return { photo }
    },
  )

  app.post<{ Params: { id: string; recordId: string; photoId: string } }>(
    '/pets/:id/medical/:recordId/photos/:photoId/file',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Replace medical proof photo file (e.g. after crop)',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id', 'recordId', 'photoId'],
          properties: {
            id: { type: 'string' },
            recordId: { type: 'string' },
            photoId: { type: 'string' },
          },
        },
        response: {
          200: petMedicalPhotoSingleResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const recordId = parseIdParam(request.params.recordId, 'record id')
      const photoId = parseIdParam(request.params.photoId, 'photo id')
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const photo = await replacePetMedicalPhotoFile(
        getUserId(request),
        petId,
        recordId,
        photoId,
        file,
      )
      return { photo }
    },
  )

  app.delete<{ Params: { id: string; recordId: string; photoId: string } }>(
    '/pets/:id/medical/:recordId/photos/:photoId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Delete a medical proof photo',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'recordId', 'photoId'],
          properties: {
            id: { type: 'string' },
            recordId: { type: 'string' },
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
      const recordId = parseIdParam(request.params.recordId, 'record id')
      const photoId = parseIdParam(request.params.photoId, 'photo id')
      await deletePetMedicalPhoto(getUserId(request), petId, recordId, photoId)
      return reply.status(204).send()
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id/personality',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Get pet personality trait sliders (defaults to 5 if unset)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petPersonalityResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const personality = await getPetPersonality(getUserId(request), petId)
      return { personality }
    },
  )

  app.put<{ Params: { id: string }; Body: PetPersonalityInput }>(
    '/pets/:id/personality',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Create or update pet personality traits (1–10)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: upsertPetPersonalityBodySchema,
        response: {
          200: petPersonalityResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const personality = await upsertPetPersonality(
        getUserId(request),
        petId,
        request.body,
      )
      return { personality }
    },
  )

  app.get<{
    Params: { id: string }
    Querystring: { limit?: number; offset?: number }
  }>(
    '/pets/:id/events',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List pet lifecycle events (newest first)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: petEventsListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return listPetEvents(getUserId(request), petId, {
        limit: request.query.limit,
        offset: request.query.offset,
      })
    },
  )

  app.get<{
    Params: { id: string }
    Querystring: { limit?: number; offset?: number; activeOnly?: boolean }
  }>(
    '/pets/:id/memories',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List pet memories for AI context (owner API; no public UI yet)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
            activeOnly: { type: 'boolean' },
          },
        },
        response: {
          200: petMemoriesListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return listPetMemories(getUserId(request), petId, {
        limit: request.query.limit,
        offset: request.query.offset,
        activeOnly: request.query.activeOnly,
      })
    },
  )

  app.get<{
    Params: { id: string }
    Querystring: { status?: 'active' | 'completed' | 'cancelled' | 'all' }
  }>(
    '/pets/:id/goals',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List pet goals (backend rules; no public UI yet)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'completed', 'cancelled', 'all'],
            },
          },
        },
        response: {
          200: petGoalsListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const status = request.query.status ?? PET_GOAL_STATUSES.ACTIVE
      return listPetGoals(getUserId(request), petId, { status })
    },
  )

  app.get<{
    Params: { id: string }
    Querystring: { limit?: number; offset?: number }
  }>(
    '/pets/:id/ai-drafts',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary:
          'List AI text drafts (not published to feed yet; no public UI)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: petAiDraftsListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return listPetAiDrafts(getUserId(request), petId, {
        limit: request.query.limit,
        offset: request.query.offset,
      })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id/friends',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List friends of an owned pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petFriendsListResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      await getPetById(getUserId(request), petId)
      return { friends: await listPetFriends(petId) }
    },
  )

  app.post<{
    Params: { id: string }
    Body: { friendPetId: number }
  }>(
    '/pets/:id/friends',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Make friends between an owned pet and another pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: createPetFriendshipBodySchema,
        response: {
          200: petFriendsListResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const fromPetId = parseIdParam(request.params.id, 'pet id')
      const friendPetId = Number(request.body.friendPetId)
      if (!Number.isInteger(friendPetId) || friendPetId < 1) {
        throw new AppError(400, 'Invalid friend pet id', 'VALIDATION_ERROR')
      }
      return createFriendship(getUserId(request), fromPetId, friendPetId)
    },
  )

  app.delete<{
    Params: { id: string; friendPetId: string }
  }>(
    '/pets/:id/friends/:friendPetId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Remove a friendship (owner of either pet)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'friendPetId'],
          properties: {
            id: { type: 'string' },
            friendPetId: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const friendPetId = parseIdParam(request.params.friendPetId, 'friend pet id')
      await deleteFriendship(getUserId(request), petId, friendPetId)
      return reply.code(204).send()
    },
  )

  app.get<{ Params: { id: string } }>(
    '/pets/:id/friend-suggestions',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'List pending friendship suggestions for an owned pet',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petFriendshipSuggestionsResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return listPendingFriendshipSuggestions(getUserId(request), petId)
    },
  )

  app.post<{ Params: { id: string } }>(
    '/pets/:id/friend-suggestions/generate',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Generate friendship suggestions (same species, other owners)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: petFriendshipSuggestionsResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      return generateFriendshipSuggestions(getUserId(request), petId)
    },
  )

  app.post<{ Params: { id: string; suggestionId: string } }>(
    '/pets/:id/friend-suggestions/:suggestionId/approve',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Approve a friendship suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'suggestionId'],
          properties: {
            id: { type: 'string' },
            suggestionId: { type: 'string' },
          },
        },
        response: {
          200: petFriendsListResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const suggestionId = parseIdParam(request.params.suggestionId, 'suggestion id')
      return approveFriendshipSuggestion(getUserId(request), petId, suggestionId)
    },
  )

  app.post<{ Params: { id: string; suggestionId: string } }>(
    '/pets/:id/friend-suggestions/:suggestionId/decline',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Decline a friendship suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'suggestionId'],
          properties: {
            id: { type: 'string' },
            suggestionId: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const petId = parseIdParam(request.params.id, 'pet id')
      const suggestionId = parseIdParam(request.params.suggestionId, 'suggestion id')
      await declineFriendshipSuggestion(getUserId(request), petId, suggestionId)
      return reply.code(204).send()
    },
  )
}
