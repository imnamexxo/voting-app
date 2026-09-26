import { randomBytes } from "node:crypto";
import { sql } from "./db";

export type Option = { id: string; label: string };
export type Poll = { id: string; question: string; options: Option[] };

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 100;

// Counts Unicode code points, not UTF-16 code units.
const length = (text: string) => [...text].length;

export type PollFieldErrors = {
  question?: string;
  // An error about the Option list as a whole, such as how many there are.
  options?: string;
  // Errors for individual Options, keyed by their position in the input.
  eachOption?: Record<number, string>;
};

export class PollValidationError extends Error {
  constructor(readonly fieldErrors: PollFieldErrors) {
    super("Invalid Poll");
  }
}

export async function createPoll(input: {
  question: string;
  options: string[];
  creatorId: string;
}): Promise<string> {
  const question = input.question.trim();
  const options = input.options.map((label) => label.trim());

  const errors: PollFieldErrors = {};
  if (question === "") errors.question = "질문을 입력해 주세요.";
  else if (length(question) > MAX_QUESTION_LENGTH)
    errors.question = `질문은 ${MAX_QUESTION_LENGTH}자 이하로 적어 주세요.`;

  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS)
    errors.options = `선택지는 ${MIN_OPTIONS}–${MAX_OPTIONS}개로 만들어 주세요.`;

  const eachOption: Record<number, string> = {};
  const seen = new Set<string>();
  options.forEach((label, i) => {
    const key = label.toLowerCase();
    if (label === "") eachOption[i] = "선택지를 입력해 주세요.";
    else if (length(label) > MAX_OPTION_LENGTH)
      eachOption[i] = `선택지는 ${MAX_OPTION_LENGTH}자 이하로 적어 주세요.`;
    else if (seen.has(key)) eachOption[i] = "이미 있는 선택지예요.";
    seen.add(key);
  });
  if (Object.keys(eachOption).length > 0) errors.eachOption = eachOption;

  if (Object.keys(errors).length > 0) throw new PollValidationError(errors);

  // 16 URL-safe characters, so Poll links can't be guessed by counting.
  const id = randomBytes(12).toString("base64url");

  // One statement, so the Poll and its Options are saved together or not at all.
  await sql`
    WITH poll AS (
      INSERT INTO polls (id, question, creator_id)
      VALUES (${id}, ${question}, ${input.creatorId})
      RETURNING id
    )
    INSERT INTO options (poll_id, label, position)
    SELECT poll.id, o.label, o.ord - 1
    FROM poll, unnest(${options}::text[]) WITH ORDINALITY AS o(label, ord)
  `;

  return id;
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  const rows = await sql`
    SELECT p.id, p.question, o.id AS option_id, o.label
    FROM polls p
    JOIN options o ON o.poll_id = p.id
    WHERE p.id = ${pollId}
    ORDER BY o.position
  `;
  if (rows.length === 0) return null;

  return {
    id: rows[0].id,
    question: rows[0].question,
    options: rows.map((r) => ({ id: String(r.option_id), label: r.label })),
  };
}

export type CastVoteResult =
  | { status: "voted" }
  | { status: "poll-not-found" }
  | { status: "option-not-in-poll" }
  | { status: "already-voted" };

export async function castVote(input: {
  pollId: string;
  optionId: string;
  voterId: string;
}): Promise<CastVoteResult> {
  // Only inserts when the Option belongs to the Poll. Comparing as text means a malformed
  // optionId from a tampered form simply matches nothing. The unique constraint turns a
  // second Vote, even one racing the first, into a no-op instead of an error.
  const inserted = await sql`
    INSERT INTO votes (poll_id, option_id, voter_id)
    SELECT o.poll_id, o.id, ${input.voterId}
    FROM options o
    WHERE o.id::text = ${input.optionId} AND o.poll_id = ${input.pollId}
    ON CONFLICT ON CONSTRAINT votes_one_per_voter DO NOTHING
    RETURNING id
  `;
  if (inserted.length === 0) {
    const [why] = await sql`
      SELECT
        EXISTS (SELECT 1 FROM polls WHERE id = ${input.pollId}) AS poll_exists,
        EXISTS (
          SELECT 1 FROM options WHERE id::text = ${input.optionId} AND poll_id = ${input.pollId}
        ) AS option_in_poll,
        EXISTS (
          SELECT 1 FROM votes WHERE poll_id = ${input.pollId} AND voter_id = ${input.voterId}
        ) AS already_voted
    `;
    if (!why.poll_exists) return { status: "poll-not-found" };
    if (!why.option_in_poll) return { status: "option-not-in-poll" };
    if (why.already_voted) return { status: "already-voted" };
    throw new Error("Vote was not saved for an unknown reason");
  }
  return { status: "voted" };
}

export type OptionResult = Option & { votes: number; percent: number };
export type Results = {
  totalVotes: number;
  options: OptionResult[];
  // The Option the viewer voted for, if they have voted.
  chosenOptionId?: string;
};

// Whether the viewer may see a Poll's Results, and the Results when they may.
// A Voter's own Vote takes precedence as the reason once the Creator has voted too.
export type ResultsAccess =
  | { status: "visible"; reason: "voted" | "creator"; results: Results }
  | { status: "hidden" };

export async function getResults(input: {
  pollId: string;
  viewerId?: string;
}): Promise<ResultsAccess | null> {
  const rows = await sql`
    SELECT
      o.id,
      o.label,
      count(v.id)::int AS votes,
      coalesce(bool_or(v.voter_id = ${input.viewerId ?? null}), false) AS chosen,
      coalesce(p.creator_id = ${input.viewerId ?? null}, false) AS viewer_is_creator
    FROM options o
    JOIN polls p ON p.id = o.poll_id
    LEFT JOIN votes v ON v.option_id = o.id
    WHERE o.poll_id = ${input.pollId}
    GROUP BY o.id, p.creator_id
    ORDER BY o.position
  `;
  if (rows.length === 0) return null;

  // Results stay hidden until the viewer votes, so other Votes can't sway theirs. The Creator
  // can always see them.
  const chosen = rows.find((r) => r.chosen);
  if (!chosen && !rows[0].viewer_is_creator) return { status: "hidden" };

  const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
  return {
    status: "visible",
    reason: chosen ? "voted" : "creator",
    results: {
      totalVotes,
      chosenOptionId: chosen ? String(chosen.id) : undefined,
      options: rows.map((r) => ({
        id: String(r.id),
        label: r.label,
        votes: r.votes,
        percent: totalVotes === 0 ? 0 : Math.round((r.votes / totalVotes) * 100),
      })),
    },
  };
}
