-- Add GIN index for faster tag filtering on contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tags_gin ON contacts USING GIN (tags);
