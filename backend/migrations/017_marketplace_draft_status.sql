-- Allow draft listings for save-without-publish workflow.

ALTER TABLE marketplace_listings
DROP CONSTRAINT marketplace_listings_status_check;

ALTER TABLE marketplace_listings
ADD CONSTRAINT marketplace_listings_status_check
CHECK (status IN ('draft', 'active', 'archived', 'closed'));
