-- An optional Closing time. Existing Polls stay NULL, which means they never close.
ALTER TABLE polls ADD COLUMN closes_at timestamptz;
