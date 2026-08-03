-- Optional shared physical traits for all species (edit pet Physical tab).

ALTER TABLE pets
  ADD COLUMN weight_kg NUMERIC(8, 3) NULL,
  ADD COLUMN color TEXT NULL,
  ADD COLUMN length_cm NUMERIC(8, 2) NULL,
  ADD COLUMN height_cm NUMERIC(8, 2) NULL,
  ADD COLUMN markings TEXT NULL,
  ADD COLUMN physical_notes TEXT NULL;

ALTER TABLE pets
  ADD CONSTRAINT pets_weight_kg_nonneg CHECK (weight_kg IS NULL OR weight_kg >= 0),
  ADD CONSTRAINT pets_length_cm_nonneg CHECK (length_cm IS NULL OR length_cm >= 0),
  ADD CONSTRAINT pets_height_cm_nonneg CHECK (height_cm IS NULL OR height_cm >= 0),
  ADD CONSTRAINT pets_color_max CHECK (color IS NULL OR char_length(color) <= 120),
  ADD CONSTRAINT pets_markings_max CHECK (markings IS NULL OR char_length(markings) <= 500),
  ADD CONSTRAINT pets_physical_notes_max CHECK (
    physical_notes IS NULL OR char_length(physical_notes) <= 2000
  );

COMMENT ON COLUMN pets.weight_kg IS 'Optional body weight in kilograms.';
COMMENT ON COLUMN pets.color IS 'Optional coat/color description (English content).';
COMMENT ON COLUMN pets.length_cm IS 'Optional body length in centimeters.';
COMMENT ON COLUMN pets.height_cm IS 'Optional height at withers / standing height in centimeters.';
COMMENT ON COLUMN pets.markings IS 'Optional markings / pattern notes.';
COMMENT ON COLUMN pets.physical_notes IS 'Free-form physical notes (optional).';
