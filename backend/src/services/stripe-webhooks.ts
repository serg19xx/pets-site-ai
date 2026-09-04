import type { PoolClient } from 'pg'
import Stripe from 'stripe'

import { pool } from '../db/pool.js'

export interface StripeWebhookProcessResult {
  duplicate: boolean
  outcome: 'processed' | 'ignored'
}

interface StripeCustomerMapping {
  userId: number
  stripeCustomerId: string
}

function stripeId(value: { id: string } | string | null | undefined): string | null {
  if (!value) {
    return null
  }
  return typeof value === 'string' ? value : value.id
}

function timestamp(value: number | null | undefined): Date | null {
  return value == null ? null : new Date(value * 1000)
}

async function findCustomerMapping(
  client: PoolClient,
  customerId: string | null,
  livemode: boolean,
): Promise<StripeCustomerMapping | null> {
  if (!customerId) {
    return null
  }
  const result = await client.query<{ user_id: string; stripe_customer_id: string }>(
    `SELECT user_id, stripe_customer_id
     FROM stripe_customers
     WHERE stripe_customer_id = $1 AND livemode = $2`,
    [customerId, livemode],
  )
  const row = result.rows[0]
  return row
    ? {
        userId: Number(row.user_id),
        stripeCustomerId: row.stripe_customer_id,
      }
    : null
}

function subscriptionPeriods(subscription: Stripe.Subscription): {
  start: Date | null
  end: Date | null
} {
  const items = subscription.items.data
  if (items.length === 0) {
    return { start: null, end: null }
  }
  const starts = items.map((item) => item.current_period_start)
  const ends = items.map((item) => item.current_period_end)
  return {
    start: timestamp(Math.min(...starts)),
    end: timestamp(Math.max(...ends)),
  }
}

async function handleSubscription(
  client: PoolClient,
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<boolean> {
  const customerId = stripeId(subscription.customer)
  const mapping = await findCustomerMapping(client, customerId, subscription.livemode)
  if (!mapping) {
    return false
  }

  const firstItem = subscription.items.data[0]
  const periods = subscriptionPeriods(subscription)
  await client.query(
    `INSERT INTO stripe_subscriptions (
       stripe_subscription_id, stripe_customer_id, user_id, status,
       stripe_price_id, currency, cancel_at_period_end,
       current_period_start, current_period_end, canceled_at, ended_at,
       livemode, stripe_created_at, last_stripe_event_created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       user_id = EXCLUDED.user_id,
       status = EXCLUDED.status,
       stripe_price_id = EXCLUDED.stripe_price_id,
       currency = EXCLUDED.currency,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       canceled_at = EXCLUDED.canceled_at,
       ended_at = EXCLUDED.ended_at,
       livemode = EXCLUDED.livemode,
       last_stripe_event_created_at = EXCLUDED.last_stripe_event_created_at,
       updated_at = NOW()
     WHERE stripe_subscriptions.last_stripe_event_created_at
       <= EXCLUDED.last_stripe_event_created_at`,
    [
      subscription.id,
      mapping.stripeCustomerId,
      mapping.userId,
      subscription.status,
      firstItem?.price.id ?? null,
      subscription.currency,
      subscription.cancel_at_period_end,
      periods.start,
      periods.end,
      timestamp(subscription.canceled_at),
      timestamp(subscription.ended_at),
      subscription.livemode,
      timestamp(subscription.created),
      timestamp(eventCreated),
    ],
  )
  return true
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const current = invoice.parent?.subscription_details?.subscription
  if (current) {
    return stripeId(current)
  }

  // Events created with an older Stripe API version may use the legacy field.
  const legacy = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null
  }
  return stripeId(legacy.subscription)
}

async function handleInvoice(
  client: PoolClient,
  invoice: Stripe.Invoice,
  eventType: 'invoice.paid' | 'invoice.payment_failed',
  eventCreated: number,
): Promise<boolean> {
  const customerId = stripeId(invoice.customer)
  const mapping = await findCustomerMapping(client, customerId, invoice.livemode)
  if (!mapping) {
    return false
  }

  const isPaid = eventType === 'invoice.paid'
  await client.query(
    `INSERT INTO stripe_invoices (
       stripe_invoice_id, stripe_customer_id, stripe_subscription_id, user_id,
       status, payment_state, amount_due, amount_paid, currency,
       hosted_invoice_url, invoice_pdf_url, paid_at, payment_failed_at,
       livemode, stripe_created_at, last_stripe_event_created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       user_id = EXCLUDED.user_id,
       status = EXCLUDED.status,
       payment_state = EXCLUDED.payment_state,
       amount_due = EXCLUDED.amount_due,
       amount_paid = EXCLUDED.amount_paid,
       currency = EXCLUDED.currency,
       hosted_invoice_url = EXCLUDED.hosted_invoice_url,
       invoice_pdf_url = EXCLUDED.invoice_pdf_url,
       paid_at = COALESCE(EXCLUDED.paid_at, stripe_invoices.paid_at),
       payment_failed_at = EXCLUDED.payment_failed_at,
       livemode = EXCLUDED.livemode,
       last_stripe_event_created_at = EXCLUDED.last_stripe_event_created_at,
       updated_at = NOW()
     WHERE stripe_invoices.last_stripe_event_created_at
       <= EXCLUDED.last_stripe_event_created_at`,
    [
      invoice.id,
      mapping.stripeCustomerId,
      invoiceSubscriptionId(invoice),
      mapping.userId,
      invoice.status,
      isPaid ? 'paid' : 'failed',
      invoice.amount_due,
      invoice.amount_paid,
      invoice.currency,
      invoice.hosted_invoice_url ?? null,
      invoice.invoice_pdf ?? null,
      isPaid ? timestamp(invoice.status_transitions.paid_at ?? eventCreated) : null,
      isPaid ? null : timestamp(eventCreated),
      invoice.livemode,
      timestamp(invoice.created),
      timestamp(eventCreated),
    ],
  )
  return true
}

async function handleSupportedEvent(
  client: PoolClient,
  event: Stripe.Event,
): Promise<boolean> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return handleSubscription(
        client,
        event.data.object as Stripe.Subscription,
        event.created,
      )
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return handleInvoice(
        client,
        event.data.object as Stripe.Invoice,
        event.type,
        event.created,
      )
    default:
      return false
  }
}

/**
 * Claims the Stripe event and executes its projection updates in one transaction.
 * A failed transaction rolls back both the claim and all business writes, allowing
 * Stripe's retry to process it safely. A committed event id is never run twice.
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookProcessResult> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const claim = await client.query(
      `INSERT INTO stripe_webhook_events (
         stripe_event_id, event_type, livemode, outcome
       )
       VALUES ($1, $2, $3, 'processed')
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [event.id, event.type, event.livemode],
    )

    if (claim.rowCount === 0) {
      const existing = await client.query<{ outcome: 'processed' | 'ignored' }>(
        `SELECT outcome
         FROM stripe_webhook_events
         WHERE stripe_event_id = $1`,
        [event.id],
      )
      await client.query('COMMIT')
      return {
        duplicate: true,
        outcome: existing.rows[0]?.outcome ?? 'ignored',
      }
    }

    const wasProcessed = await handleSupportedEvent(client, event)
    const outcome = wasProcessed ? 'processed' : 'ignored'
    await client.query(
      `UPDATE stripe_webhook_events
       SET outcome = $2, processed_at = NOW()
       WHERE stripe_event_id = $1`,
      [event.id, outcome],
    )
    await client.query('COMMIT')
    return { duplicate: false, outcome }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
