import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'

import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { processStripeWebhookEvent } from '../services/stripe-webhooks.js'

const stripe = new Stripe('sk_test_webhook_signature_only')

const stripeWebhookResponseSchema = {
  type: 'object',
  properties: {
    received: { type: 'boolean' },
    eventId: { type: 'string' },
    eventType: { type: 'string' },
  },
  required: ['received', 'eventId', 'eventType'],
} as const

export const stripeWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
      schema: {
        tags: ['stripe'],
        summary: 'Receive a signed Stripe webhook event',
        description:
          'Verifies Stripe-Signature and idempotently processes supported subscription and invoice events.',
        headers: {
          type: 'object',
          properties: {
            'stripe-signature': { type: 'string' },
          },
          required: ['stripe-signature'],
        },
        response: {
          200: stripeWebhookResponseSchema,
          400: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const webhookSecret = config.stripeWebhookSecret
      if (!webhookSecret) {
        throw new AppError(
          503,
          'Stripe webhook is not configured',
          'STRIPE_WEBHOOK_NOT_CONFIGURED',
        )
      }

      const signature = request.headers['stripe-signature']
      const raw = request.rawBody
      if (typeof signature !== 'string' || !raw) {
        throw new AppError(400, 'Invalid Stripe webhook request', 'INVALID_WEBHOOK')
      }

      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(raw, signature, webhookSecret)
      } catch (error) {
        request.log.warn(
          { error: error instanceof Error ? error.message : 'Unknown signature error' },
          'Stripe webhook signature verification failed',
        )
        throw new AppError(400, 'Invalid Stripe signature', 'INVALID_STRIPE_SIGNATURE')
      }

      request.log.info(
        {
          stripeEventId: event.id,
          stripeEventType: event.type,
        },
        'Stripe webhook received',
      )

      const result = await processStripeWebhookEvent(event)
      request.log.info(
        {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeEventOutcome: result.outcome,
          isDuplicate: result.duplicate,
        },
        'Stripe webhook handled',
      )

      return {
        received: true,
        eventId: event.id,
        eventType: event.type,
      }
    },
  )
}
