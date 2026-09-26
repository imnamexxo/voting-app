CREATE TABLE polls (
  id text PRIMARY KEY,
  question text NOT NULL,
  creator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE options (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL,
  UNIQUE (poll_id, position)
);
