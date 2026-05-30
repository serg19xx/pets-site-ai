-- Marketplace listing inquiries: on-site messages between customer and seller.

ALTER TABLE marketplace_listings
  ADD COLUMN inquiry_notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN inquiry_notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN inquiry_sms_phone TEXT;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT marketplace_listings_inquiry_sms_phone_len_check
    CHECK (inquiry_sms_phone IS NULL OR char_length(inquiry_sms_phone) BETWEEN 7 AND 40);

CREATE TABLE marketplace_listing_inquiries (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings (id) ON DELETE CASCADE,
  customer_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seller_last_read_at TIMESTAMPTZ,
  customer_last_read_at TIMESTAMPTZ,
  CONSTRAINT marketplace_listing_inquiries_unique_customer
    UNIQUE (listing_id, customer_user_id)
);

CREATE INDEX marketplace_listing_inquiries_listing_id_idx
  ON marketplace_listing_inquiries (listing_id, updated_at DESC);
CREATE INDEX marketplace_listing_inquiries_customer_id_idx
  ON marketplace_listing_inquiries (customer_user_id, updated_at DESC);

CREATE TABLE marketplace_inquiry_messages (
  id BIGSERIAL PRIMARY KEY,
  inquiry_id BIGINT NOT NULL REFERENCES marketplace_listing_inquiries (id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_inquiry_messages_body_len_check
    CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX marketplace_inquiry_messages_inquiry_id_idx
  ON marketplace_inquiry_messages (inquiry_id, created_at ASC);
