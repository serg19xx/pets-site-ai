-- Beta MVP: medical visit/procedure records with proof photos (edit tab only).

CREATE TABLE pet_medical_records (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  visited_on DATE NOT NULL,
  clinic_name TEXT NULL,
  doctor_name TEXT NULL,
  procedure_label TEXT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_medical_clinic_name_max CHECK (
    clinic_name IS NULL OR char_length(clinic_name) <= 200
  ),
  CONSTRAINT pet_medical_doctor_name_max CHECK (
    doctor_name IS NULL OR char_length(doctor_name) <= 200
  ),
  CONSTRAINT pet_medical_procedure_label_len CHECK (
    char_length(trim(procedure_label)) >= 1
    AND char_length(procedure_label) <= 300
  ),
  CONSTRAINT pet_medical_notes_max CHECK (
    notes IS NULL OR char_length(notes) <= 2000
  )
);

CREATE INDEX pet_medical_records_pet_visited_idx
  ON pet_medical_records (pet_id, visited_on DESC, id DESC);

CREATE TABLE pet_medical_photos (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT NOT NULL REFERENCES pet_medical_records (id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pet_medical_photos_record_sort_idx
  ON pet_medical_photos (record_id, sort_order, id);

COMMENT ON TABLE pet_medical_records IS
  'Beta medical visits/procedures for a pet; owner edit tab only in this wave.';
COMMENT ON TABLE pet_medical_photos IS
  'Proof photos attached to a medical record (max enforced in app).';
