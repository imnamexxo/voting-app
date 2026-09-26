import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { castVote, createPoll, getPoll, getResults, PollValidationError } from "./polls";

const creatorId = () => `test-creator-${randomUUID()}`;
const voterId = () => `test-voter-${randomUUID()}`;

// Creates a Poll and returns it with its Option ids.
async function pollWith(options: string[]) {
  const pollId = await createPoll({ question: "어디로 갈까요?", options, creatorId: creatorId() });
  const poll = await getPoll(pollId);
  if (!poll) throw new Error("created Poll not found");
  return poll;
}

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

describe("Vote and Results", () => {
  test("after one Vote, the chosen Option has the only Vote", async () => {
    const poll = await pollWith(["바다", "산"]);
    const [sea, mountain] = poll.options;

    await castVote({ pollId: poll.id, optionId: sea.id, voterId: voterId() });
    const results = await getResults({ pollId: poll.id, viewerId: voterId() });

    expect(results?.totalVotes).toBe(1);
    expect(results?.options).toEqual([
      { id: sea.id, label: "바다", votes: 1, percent: 100 },
      { id: mountain.id, label: "산", votes: 0, percent: 0 },
    ]);
  });

  test("Results count every Vote and round each Option's share to a whole percent", async () => {
    const poll = await pollWith(["바다", "산", "도시"]);
    const [sea, mountain] = poll.options;

    for (const optionId of [sea.id, sea.id, mountain.id]) {
      await castVote({ pollId: poll.id, optionId, voterId: voterId() });
    }
    const results = await getResults({ pollId: poll.id, viewerId: voterId() });

    expect(results?.totalVotes).toBe(3);
    expect(results?.options.map((o) => [o.votes, o.percent])).toEqual([
      [2, 67],
      [1, 33],
      [0, 0],
    ]);
  });

  test("a Poll with no Votes shows every Option at 0%", async () => {
    const poll = await pollWith(["바다", "산"]);

    const results = await getResults({ pollId: poll.id, viewerId: voterId() });

    expect(results?.totalVotes).toBe(0);
    expect(results?.options.map((o) => [o.votes, o.percent])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test("Results tell a Voter which Option they chose", async () => {
    const poll = await pollWith(["바다", "산"]);
    const mountain = poll.options[1];
    const me = voterId();

    await castVote({ pollId: poll.id, optionId: mountain.id, voterId: me });

    expect((await getResults({ pollId: poll.id, viewerId: me }))?.chosenOptionId).toBe(mountain.id);
  });

  test("Results show no choice to someone who hasn't voted", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId() });

    expect((await getResults({ pollId: poll.id, viewerId: voterId() }))?.chosenOptionId).toBeUndefined();
  });

  test("Results show no choice when the viewer is unknown", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId() });

    expect((await getResults({ pollId: poll.id }))?.chosenOptionId).toBeUndefined();
  });

  test("a Vote for an Option of another Poll is rejected and not counted", async () => {
    const poll = await pollWith(["바다", "산"]);
    const other = await pollWith(["짜장", "짬뽕"]);

    const result = await castVote({
      pollId: poll.id,
      optionId: other.options[0].id,
      voterId: voterId(),
    });

    expect(result.status).toBe("option-not-in-poll");
    expect((await getResults({ pollId: poll.id }))?.totalVotes).toBe(0);
    expect((await getResults({ pollId: other.id }))?.totalVotes).toBe(0);
  });

  test("a Vote on a Poll that doesn't exist reports the Poll as not found", async () => {
    const result = await castVote({ pollId: "no-such-poll", optionId: "1", voterId: voterId() });
    expect(result.status).toBe("poll-not-found");
  });

  test("Results of a Poll that doesn't exist are nothing", async () => {
    expect(await getResults({ pollId: "no-such-poll" })).toBeNull();
  });

  test.each(["", "abc", "1; DROP TABLE votes"])(
    "a Vote with a malformed Option id %j is rejected",
    async (optionId) => {
      const poll = await pollWith(["바다", "산"]);
      const result = await castVote({ pollId: poll.id, optionId, voterId: voterId() });
      expect(result.status).toBe("option-not-in-poll");
    },
  );
});
