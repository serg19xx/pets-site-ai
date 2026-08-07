-- Soft-launch: only companion species selectable for new pets.
-- Existing pets keep their species even if deactivated.

ALTER TABLE pet_species
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN pet_species.is_active IS
  'When false, species is hidden from create/edit pickers (existing pets remain).';

-- Launch MVP companion set (Quebec soft launch).
UPDATE pet_species
SET is_active = true
WHERE slug IN (
  'cat',
  'dog',
  'rabbit',
  'bird',
  'hamster',
  'guinea_pig',
  'ferret',
  'horse'
);

UPDATE pet_species
SET is_active = false
WHERE slug NOT IN (
  'cat',
  'dog',
  'rabbit',
  'bird',
  'hamster',
  'guinea_pig',
  'ferret',
  'horse'
);
