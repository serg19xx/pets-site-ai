-- Stripe webhook idempotency and local billing projections.
-- stripe_customers is populated by a future authenticated Checkout/customer flow.
-- Webhooks never infer an application user from email or untrusted metadata.

CREATE TABLE stripe_customers (
  stripe_customer_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  livemode BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_customers_user_mode_unique UNIQUE (user_id, livemode)
);

CREATE TABLE stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  outcome TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_webhook_events_outcome_check
    CHECK (outcome IN ('processed', 'ignored'))
);

CREATE INDEX stripe_webhook_events_received_idx
  ON stripe_webhook_events (received_at DESC);

CREATE TABLE stripe_subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers (stripe_customer_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  stripe_price_id TEXT,
  currency TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  livemode BOOLEAN NOT NULL,
  stripe_created_at TIMESTAMPTZ NOT NULL,
  last_stripe_event_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX stripe_subscriptions_user_idx
  ON stripe_subscriptions (user_id, status);

CREATE INDEX stripe_subscriptions_customer_idx
  ON stripe_subscriptions (stripe_customer_id);

CREATE TABLE stripe_invoices (
  stripe_invoice_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers (stripe_customer_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT,
  payment_state TEXT NOT NULL,
  amount_due BIGINT NOT NULL,
  amount_paid BIGINT NOT NULL,
  currency TEXT NOT NULL,
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  payment_failed_at TIMESTAMPTZ,
  livemode BOOLEAN NOT NULL,
  stripe_created_at TIMESTAMPTZ NOT NULL,
  last_stripe_event_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_invoices_payment_state_check
    CHECK (payment_state IN ('paid', 'failed'))
);

CREATE INDEX stripe_invoices_user_created_idx
  ON stripe_invoices (user_id, stripe_created_at DESC);

CREATE INDEX stripe_invoices_customer_created_idx
  ON stripe_invoices (stripe_customer_id, stripe_created_at DESC);

COMMENT ON TABLE stripe_customers IS
  'Explicit mapping created by an authenticated billing flow. Webhooks must not infer users from email.';
COMMENT ON TABLE stripe_webhook_events IS
  'Successfully committed Stripe events. Unique event id provides transactional webhook idempotency.';
COMMENT ON TABLE stripe_subscriptions IS
  'Local projection of Stripe subscriptions for known application users.';
COMMENT ON TABLE stripe_invoices IS
  'Local projection of paid and failed Stripe subscription invoices.';
