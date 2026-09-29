import { describe, expect, test } from "vitest";
import { operatorSessionToken, passwordMatches, sessionIsValid } from "./operator";

const password = "correct horse battery staple";
const now = new Date("2026-10-01T12:00:00+09:00");

describe("Operator password", () => {
  test("the configured password matches", () => {
    expect(passwordMatches("correct horse battery staple", password)).toBe(true);
  });

  test.each(["", "correct horse", "Correct horse battery staple", `${password} `])(
    "a different password %j doesn't match",
    (input) => {
      expect(passwordMatches(input, password)).toBe(false);
    },
  );

  test("nothing matches when no password is configured", () => {
    expect(passwordMatches("", undefined)).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});

describe("Operator session", () => {
  test("a session token is valid until it expires 12 hours later", () => {
    const token = operatorSessionToken(password, now);

    expect(sessionIsValid(token, password, new Date("2026-10-01T23:59:59+09:00"))).toBe(true);
    expect(sessionIsValid(token, password, new Date("2026-10-02T00:00:00+09:00"))).toBe(false);
  });

  test("a session token stops being valid when the password changes", () => {
    const token = operatorSessionToken(password, now);
    expect(sessionIsValid(token, "a new password", now)).toBe(false);
  });

  test("a token with a pushed-back expiry is not valid", () => {
    const [, signature] = operatorSessionToken(password, now).split(".");
    const forged = `${new Date("2030-01-01T00:00:00Z").getTime()}.${signature}`;
    expect(sessionIsValid(forged, password, now)).toBe(false);
  });

  test.each([undefined, "", "garbage", "123.abc"])("a malformed token %j is not valid", (token) => {
    expect(sessionIsValid(token, password, now)).toBe(false);
  });

  test("no session is valid when no password is configured", () => {
    const token = operatorSessionToken(password, now);
    expect(sessionIsValid(token, undefined, now)).toBe(false);
  });
});
