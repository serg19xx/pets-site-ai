-- Beta MVP: certificate document photos per pet (edit tab only; public later).

CREATE TABLE pet_certificates (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pet_certificates_pet_id_sort_idx
  ON pet_certificates (pet_id, sort_order, id);

COMMENT ON TABLE pet_certificates IS
  'Beta certificate photo gallery for a pet; owner edit tab only in this wave.';
