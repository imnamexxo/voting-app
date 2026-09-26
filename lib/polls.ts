import { randomBytes } from "node:crypto";
import { sql } from "./db";

export type Option = { id: string; label: string };
export type Poll = { id: string; question: string; options: Option[] };

export async function createPoll(input: {
  question: string;
  options: string[];
  creatorId: string;
}): Promise<string> {
  // 16 URL-safe characters, so Poll links can't be guessed by counting.
  const id = randomBytes(12).toString("base64url");

  // One statement, so the Poll and its Options are saved together or not at all.
  await sql`
    WITH poll AS (
      INSERT INTO polls (id, question, creator_id)
      VALUES (${id}, ${input.question}, ${input.creatorId})
      RETURNING id
    )
    INSERT INTO options (poll_id, label, position)
    SELECT poll.id, o.label, o.ord - 1
    FROM poll, unnest(${input.options}::text[]) WITH ORDINALITY AS o(label, ord)
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
