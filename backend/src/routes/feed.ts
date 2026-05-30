import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getOptionalUserId, getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import {
  feedCommentSchema,
  feedCommentsResponseSchema,
  feedPostResponseSchema,
  feedPostsResponseSchema,
  postEngagementSchema,
  postSaveSchema,
} from '../schemas/feed.js'
import {
  createFeedPost,
  deleteFeedPost,
  getFeedPostById,
  listFeedPosts,
  listMyFeedPosts,
  listSavedFeedPosts,
  updateFeedPostBody,
  type PendingPostMedia,
} from '../services/feed-posts.js'
import {
  createPostComment,
  deletePostComment,
  listPostComments,
  togglePostLike,
  togglePostSave,
} from '../services/post-engagement.js'

function parseLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 20
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 50) {
    throw new AppError(400, 'Invalid limit (1–50)', 'VALIDATION_ERROR')
  }
  return n
}

function parseOffset(value: unknown): number {
  if (value === undefined || value === '') {
    return 0
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(400, 'Invalid offset', 'VALIDATION_ERROR')
  }
  return n
}

function parsePostId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid post id', 'VALIDATION_ERROR')
  }
  return n
}

export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/feed/posts',
    {
      onRequest: [app.authenticateOptional],
      schema: {
        tags: ['feed'],
        summary: 'List community feed posts',
        description:
          'Newest first. Guests see posts without like/save state. Query: `limit` (1–50, default 20), `offset`.',
        response: {
          200: feedPostsResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const limit = parseLimit(q.limit)
      const offset = parseOffset(q.offset)
      const viewerId = getOptionalUserId(request)
      return listFeedPosts(limit, offset, viewerId)
    },
  )

  app.get(
    '/feed/posts/mine',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'List my feed posts',
        security: [{ bearerAuth: [] }],
        response: {
          200: feedPostsResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const userId = getUserId(request)
      return listMyFeedPosts(userId, parseLimit(q.limit), parseOffset(q.offset))
    },
  )

  app.get(
    '/feed/posts/saved',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'List posts I saved',
        security: [{ bearerAuth: [] }],
        response: {
          200: feedPostsResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const userId = getUserId(request)
      return listSavedFeedPosts(userId, parseLimit(q.limit), parseOffset(q.offset))
    },
  )

  app.get(
    '/feed/posts/:id',
    {
      onRequest: [app.authenticateOptional],
      schema: {
        tags: ['feed'],
        summary: 'Get a feed post by id',
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: feedPostResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const postId = parsePostId(id)
      const viewerId = getOptionalUserId(request)
      const post = await getFeedPostById(postId, viewerId)
      return { post }
    },
  )

  app.post(
    '/feed/posts',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Create a feed post',
        description:
          'Multipart: optional field `body` (text), one or more files as `files` (images or videos). At least one of body or files is required.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: feedPostResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = getUserId(request)
      let body: string | null = null
      const files: PendingPostMedia[] = []

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'files' || part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            files.push({
              buffer,
              mimetype: part.mimetype,
              filename: part.filename,
            })
          } else {
            await part.toBuffer()
          }
        } else if (part.fieldname === 'body') {
          body = String(part.value)
        }
      }

      const post = await createFeedPost(userId, { body, files })
      return { post }
    },
  )

  app.patch<{ Params: { id: string }; Body: { body: string } }>(
    '/feed/posts/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Update my post text',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['body'],
          properties: { body: { type: 'string', minLength: 1, maxLength: 5000 } },
        },
        response: {
          200: feedPostResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const postId = parsePostId(request.params.id)
      const post = await updateFeedPostBody(getUserId(request), postId, request.body.body)
      return { post }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/feed/posts/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Delete my post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          204: { type: 'null', description: 'No content' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postId = parsePostId(request.params.id)
      await deleteFeedPost(getUserId(request), postId)
      return reply.status(204).send()
    },
  )

  app.post(
    '/feed/posts/:id/like',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Toggle like on a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: postEngagementSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const postId = parsePostId((request.params as { id: string }).id)
      return togglePostLike(postId, getUserId(request))
    },
  )

  app.post(
    '/feed/posts/:id/save',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Toggle save (bookmark) on a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: postSaveSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const postId = parsePostId((request.params as { id: string }).id)
      return togglePostSave(postId, getUserId(request))
    },
  )

  app.get(
    '/feed/posts/:id/comments',
    {
      schema: {
        tags: ['feed'],
        summary: 'List comments on a post',
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: feedCommentsResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const postId = parsePostId((request.params as { id: string }).id)
      const comments = await listPostComments(postId)
      return { comments }
    },
  )

  app.post<{ Params: { id: string }; Body: { body: string } }>(
    '/feed/posts/:id/comments',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Add a comment to a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['body'],
          properties: {
            body: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { comment: feedCommentSchema },
            required: ['comment'],
          },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const postId = parsePostId(request.params.id)
      const comment = await createPostComment(postId, getUserId(request), request.body.body)
      return { comment }
    },
  )

  app.delete<{ Params: { id: string; commentId: string } }>(
    '/feed/posts/:id/comments/:commentId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feed'],
        summary: 'Delete a comment (author or post owner)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            commentId: { type: 'string' },
          },
          required: ['id', 'commentId'],
        },
        response: {
          204: { type: 'null', description: 'No content' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postId = parsePostId(request.params.id)
      const commentId = parsePostId(request.params.commentId)
      await deletePostComment(postId, commentId, getUserId(request))
      return reply.status(204).send()
    },
  )
}
