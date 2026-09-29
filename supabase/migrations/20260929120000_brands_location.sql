-- Optional location for a discount brand: a free-text address and/or a pasted
-- Google Maps link. The app builds a keyless Maps search link from the address
-- when no explicit link is given.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS maps_url TEXT;
