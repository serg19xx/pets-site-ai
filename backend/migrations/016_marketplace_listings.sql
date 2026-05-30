-- Marketplace listings: public classifieds with optional media.

CREATE TABLE marketplace_listings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_amount NUMERIC(12, 2),
  price_currency CHAR(3) NOT NULL DEFAULT 'CAD',
  city TEXT,
  contact_phone TEXT,
  contact_method TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_listings_type_check
    CHECK (type IN ('sell', 'buy', 'exchange', 'service')),
  CONSTRAINT marketplace_listings_status_check
    CHECK (status IN ('active', 'archived', 'closed')),
  CONSTRAINT marketplace_listings_title_len_check
    CHECK (char_length(title) BETWEEN 3 AND 180),
  CONSTRAINT marketplace_listings_description_len_check
    CHECK (char_length(description) BETWEEN 10 AND 5000),
  CONSTRAINT marketplace_listings_price_amount_check
    CHECK (price_amount IS NULL OR price_amount >= 0),
  CONSTRAINT marketplace_listings_price_currency_check
    CHECK (char_length(price_currency) = 3)
);

CREATE INDEX marketplace_listings_status_created_at_idx
  ON marketplace_listings (status, created_at DESC);
CREATE INDEX marketplace_listings_user_id_created_at_idx
  ON marketplace_listings (user_id, created_at DESC);
CREATE INDEX marketplace_listings_type_created_at_idx
  ON marketplace_listings (type, created_at DESC);

CREATE TABLE marketplace_listing_media (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_listing_media_kind_check
    CHECK (kind IN ('image', 'video'))
);

CREATE INDEX marketplace_listing_media_listing_id_idx
  ON marketplace_listing_media (listing_id, sort_order);
