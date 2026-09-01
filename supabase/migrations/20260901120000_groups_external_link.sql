-- Lets a group point at an existing external chat (e.g. a WhatsApp group
-- link) instead of, or alongside, the in-app posts feed.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS external_link TEXT;
