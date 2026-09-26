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
