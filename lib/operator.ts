import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The Operator runs the app and signs in with one shared password from OPERATOR_PASSWORD.
// There are no Operator accounts. When the variable is unset, nobody can sign in.
const COOKIE = "operator_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

const digest = (text: string) => createHash("sha256").update(text).digest();

// Compares digests so the time taken doesn't reveal how much of the password was right.
export function passwordMatches(input: string, password: string | undefined): boolean {
  if (!password) return false;
  return timingSafeEqual(digest(input), digest(password));
}

// Signed with the password itself, so changing OPERATOR_PASSWORD signs every Operator out.
const sign = (password: string, expiresAt: string) =>
  createHmac("sha256", password).update(`operator-session:${expiresAt}`).digest("base64url");

// A token of the form "<expiry in ms>.<signature>".
export function operatorSessionToken(password: string, now: Date): string {
  const expiresAt = String(now.getTime() + SESSION_MS);
  return `${expiresAt}.${sign(password, expiresAt)}`;
}

export function sessionIsValid(
  token: string | undefined,
  password: string | undefined,
  now: Date,
): boolean {
  if (!token || !password) return false;
  const [expiresAt, signature, ...rest] = token.split(".");
  if (rest.length > 0 || !/^\d+$/.test(expiresAt ?? "") || !signature) return false;
  const expected = Buffer.from(sign(password, expiresAt));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  return now.getTime() < Number(expiresAt);
}

// Cookies can only be set from a Server Function or Route Handler.
export async function startOperatorSession(): Promise<void> {
  const password = process.env.OPERATOR_PASSWORD;
  if (!password) throw new Error("OPERATOR_PASSWORD is not set");
  const now = new Date();
  (await cookies()).set(COOKIE, operatorSessionToken(password, now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(now.getTime() + SESSION_MS),
  });
}

export async function endOperatorSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isOperator(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  return sessionIsValid(token, process.env.OPERATOR_PASSWORD, new Date());
}
