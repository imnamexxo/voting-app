CREATE TABLE votes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  option_id bigint NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX votes_poll_id_idx ON votes (poll_id);
