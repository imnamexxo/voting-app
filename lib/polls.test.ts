import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { createPoll, getPoll, PollValidationError } from "./polls";

const creatorId = () => `test-creator-${randomUUID()}`;

// Tries to create the Poll and returns the field errors it was rejected with.
async function rejectionOf(question: string, options: string[]) {
  try {
    await createPoll({ question, options, creatorId: creatorId() });
  } catch (err) {
    if (err instanceof PollValidationError) return err.fieldErrors;
    throw err;
  }
  throw new Error("expected the Poll to be rejected");
}

describe("Poll", () => {
  test("a created Poll can be fetched with its question and Options in entered order", async () => {
    const pollId = await createPoll({
      question: "점심 뭐 먹을까요?",
      options: ["김치찌개", "비빔밥", "냉면"],
      creatorId: creatorId(),
    });

    const poll = await getPoll(pollId);

    expect(poll?.question).toBe("점심 뭐 먹을까요?");
    expect(poll?.options.map((o) => o.label)).toEqual(["김치찌개", "비빔밥", "냉면"]);
  });

  test("fetching a Poll that doesn't exist returns nothing", async () => {
    expect(await getPoll("no-such-poll")).toBeNull();
  });

  test("the question and Options are saved without surrounding whitespace", async () => {
    const pollId = await createPoll({
      question: "  주말에 어디 갈까요?  ",
      options: [" 바다 ", "\t산\n"],
      creatorId: creatorId(),
    });

    const poll = await getPoll(pollId);

    expect(poll?.question).toBe("주말에 어디 갈까요?");
    expect(poll?.options.map((o) => o.label)).toEqual(["바다", "산"]);
  });

  test("a blank question is rejected", async () => {
    const errors = await rejectionOf("   ", ["바다", "산"]);
    expect(errors.question).toBeDefined();
  });

  test("a question of 200 characters is accepted but 201 is rejected", async () => {
    await expect(
      createPoll({ question: "가".repeat(200), options: ["바다", "산"], creatorId: creatorId() }),
    ).resolves.toBeTypeOf("string");

    const errors = await rejectionOf("가".repeat(201), ["바다", "산"]);
    expect(errors.question).toBeDefined();
  });

  test("a blank Option is rejected at its position", async () => {
    const errors = await rejectionOf("주말에 어디 갈까요?", ["바다", "  ", "산"]);
    expect(Object.keys(errors.eachOption ?? {})).toEqual(["1"]);
  });

  test("an Option of 100 characters is accepted but 101 is rejected", async () => {
    await expect(
      createPoll({ question: "길이", options: ["나".repeat(100), "산"], creatorId: creatorId() }),
    ).resolves.toBeTypeOf("string");

    const errors = await rejectionOf("길이", ["바다", "나".repeat(101)]);
    expect(Object.keys(errors.eachOption ?? {})).toEqual(["1"]);
  });

  test("a Poll with no Options is rejected", async () => {
    const errors = await rejectionOf("주말에 어디 갈까요?", []);
    expect(errors.options).toBeDefined();
  });

  test("a Poll with one Option is rejected", async () => {
    const errors = await rejectionOf("주말에 어디 갈까요?", ["바다"]);
    expect(errors.options).toBeDefined();
  });

  test("a Poll with 10 Options is accepted but 11 is rejected", async () => {
    const labels = (n: number) => Array.from({ length: n }, (_, i) => `선택지 ${i + 1}`);

    await expect(
      createPoll({ question: "개수", options: labels(10), creatorId: creatorId() }),
    ).resolves.toBeTypeOf("string");

    const errors = await rejectionOf("개수", labels(11));
    expect(errors.options).toBeDefined();
  });

  test("an Option repeating an earlier one, ignoring case and surrounding spaces, is rejected", async () => {
    const errors = await rejectionOf("저녁 메뉴", ["Pizza", "치킨", " pizza "]);
    expect(Object.keys(errors.eachOption ?? {})).toEqual(["2"]);
  });
});
