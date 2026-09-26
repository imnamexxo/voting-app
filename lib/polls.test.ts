import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { createPoll, getPoll } from "./polls";

const creatorId = () => `test-creator-${randomUUID()}`;

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
});
