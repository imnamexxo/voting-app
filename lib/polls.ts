import { randomBytes } from "node:crypto";
import { sql } from "./db";

export type Option = { id: string; label: string };
export type Poll = {
  id: string;
  question: string;
  options: Option[];
  // When the Poll stops taking Votes, or null if it never closes.
  closingTime: Date | null;
  closed: boolean;
};

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
  closingTime?: string;
};

export class PollValidationError extends Error {
  constructor(readonly fieldErrors: PollFieldErrors) {
    super("Invalid Poll");
  }
}

// Every time-based decision uses the app server's clock. Callers pass `now` to control it.
const isClosed = (closingTime: Date | null, now: Date) =>
  closingTime !== null && closingTime.getTime() <= now.getTime();

// An ISO date and time, as a datetime-local field sends it, optionally with a UTC offset.
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;

// A value without an offset comes from the form with JavaScript off, so it is read as
// Korean time. Blank means no Closing time.
function parseClosingTime(text: string): Date | null | "invalid" {
  const value = text.trim();
  if (value === "") return null;
  if (!DATE_TIME.test(value)) return "invalid";
  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(value);
  const date = new Date(hasOffset ? value : `${value}+09:00`);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export async function createPoll(input: {
  question: string;
  options: string[];
  creatorId: string;
  // An ISO date and time. Without an offset it is read as Korean time.
  closingTime?: string;
  now?: Date;
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

  const closingTime = parseClosingTime(input.closingTime ?? "");
  if (closingTime === "invalid") errors.closingTime = "마감 시간을 다시 골라 주세요.";
  else if (closingTime && isClosed(closingTime, input.now ?? new Date()))
    errors.closingTime = "마감 시간은 지금보다 뒤여야 해요.";

  // The second check is already covered by the first; it only narrows closingTime's type.
  if (Object.keys(errors).length > 0 || closingTime === "invalid")
    throw new PollValidationError(errors);

  // 16 URL-safe characters, so Poll links can't be guessed by counting.
  const id = randomBytes(12).toString("base64url");

  // One statement, so the Poll and its Options are saved together or not at all.
  await sql`
    WITH poll AS (
      INSERT INTO polls (id, question, creator_id, closes_at)
      VALUES (${id}, ${question}, ${input.creatorId}, ${closingTime?.toISOString() ?? null})
      RETURNING id
    )
    INSERT INTO options (poll_id, label, position)
    SELECT poll.id, o.label, o.ord - 1
    FROM poll, unnest(${options}::text[]) WITH ORDINALITY AS o(label, ord)
  `;

  return id;
}

export async function getPoll(
  pollId: string,
  { now = new Date() }: { now?: Date } = {},
): Promise<Poll | null> {
  const rows = await sql`
    SELECT p.id, p.question, p.closes_at, o.id AS option_id, o.label
    FROM polls p
    JOIN options o ON o.poll_id = p.id
    WHERE p.id = ${pollId}
    ORDER BY o.position
  `;
  if (rows.length === 0) return null;

  const closingTime: Date | null = rows[0].closes_at === null ? null : new Date(rows[0].closes_at);
  return {
    id: rows[0].id,
    question: rows[0].question,
    options: rows.map((r) => ({ id: String(r.option_id), label: r.label })),
    closingTime,
    closed: isClosed(closingTime, now),
  };
}

export type CastVoteResult =
  | { status: "voted" }
  | { status: "poll-not-found" }
  | { status: "closed" }
  | { status: "option-not-in-poll" }
  | { status: "already-voted" };

export async function castVote(input: {
  pollId: string;
  optionId: string;
  voterId: string;
  now?: Date;
}): Promise<CastVoteResult> {
  const now = (input.now ?? new Date()).toISOString();
  // Only inserts when the Option belongs to the Poll and the Poll isn't Closed, checked in the
  // same statement so the Closing time can't pass between the check and the save. Comparing
  // as text means a malformed optionId from a tampered form simply matches nothing. The unique
  // constraint turns a second Vote, even one racing the first, into a no-op instead of an error.
  const inserted = await sql`
    INSERT INTO votes (poll_id, option_id, voter_id)
    SELECT o.poll_id, o.id, ${input.voterId}
    FROM options o
    JOIN polls p ON p.id = o.poll_id
    WHERE o.id::text = ${input.optionId} AND o.poll_id = ${input.pollId}
      AND (p.closes_at IS NULL OR p.closes_at > ${now}::timestamptz)
    ON CONFLICT ON CONSTRAINT votes_one_per_voter DO NOTHING
    RETURNING id
  `;
  if (inserted.length === 0) {
    const [why] = await sql`
      SELECT
        EXISTS (SELECT 1 FROM polls WHERE id = ${input.pollId}) AS poll_exists,
        EXISTS (
          SELECT 1 FROM polls WHERE id = ${input.pollId} AND closes_at <= ${now}::timestamptz
        ) AS closed,
        EXISTS (
          SELECT 1 FROM options WHERE id::text = ${input.optionId} AND poll_id = ${input.pollId}
        ) AS option_in_poll,
        EXISTS (
          SELECT 1 FROM votes WHERE poll_id = ${input.pollId} AND voter_id = ${input.voterId}
        ) AS already_voted
    `;
    if (!why.poll_exists) return { status: "poll-not-found" };
    if (why.closed) return { status: "closed" };
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
