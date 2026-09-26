-- Before this, a Voter could vote on the same Poll more than once. Keep only their earliest Vote.
DELETE FROM votes later
USING votes earlier
WHERE later.poll_id = earlier.poll_id
  AND later.voter_id = earlier.voter_id
  AND later.id > earlier.id;

-- One Vote per Voter per Poll (ADR-0001). The unique index also serves lookups by poll_id.
ALTER TABLE votes ADD CONSTRAINT votes_one_per_voter UNIQUE (poll_id, voter_id);
DROP INDEX votes_poll_id_idx;
