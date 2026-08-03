-- Optional pedigree / genetics notes on Edit pet Pedigree tab.

ALTER TABLE pets
  ADD COLUMN pedigree_notes TEXT NULL;

ALTER TABLE pets
  ADD CONSTRAINT pets_pedigree_notes_max CHECK (
    pedigree_notes IS NULL OR char_length(pedigree_notes) <= 2000
  );

COMMENT ON COLUMN pets.pedigree_notes IS
  'Free-form genetics / pedigree notes (optional; edit tab).';
