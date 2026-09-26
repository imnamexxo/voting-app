import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// One anonymous ID per browser, used as both the Voter and the Creator identity (ADR-0001).
const COOKIE = "visitor_id";

// Cookies can only be set from a Server Function or Route Handler.
export async function getOrIssueVisitorId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}
