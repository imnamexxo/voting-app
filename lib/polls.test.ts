import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  castVote,
  createPoll,
  deletePoll,
  getPoll,
  getPollResults,
  getResults,
  listPolls,
  PollValidationError,
} from "./polls";

const creatorId = () => `test-creator-${randomUUID()}`;
const voterId = () => `test-voter-${randomUUID()}`;

// Creates a Poll and returns it with its Option ids and its Creator.
async function pollWith(options: string[], timing: { closingTime?: string; now?: Date } = {}) {
  const creator = creatorId();
  const pollId = await createPoll({
    question: "어디로 갈까요?",
    options,
    creatorId: creator,
    ...timing,
  });
  const poll = await getPoll(pollId, { now: timing.now });
  if (!poll) throw new Error("created Poll not found");
  return { ...poll, creatorId: creator };
}

// The current Results as the Operator reads them; fails the test if the Poll is missing.
async function currentResults(pollId: string) {
  const results = await getPollResults(pollId);
  if (!results) throw new Error("Poll not found");
  return results;
}

// The Results as the viewer sees them; fails the test if they are hidden or the Poll is missing.
async function resultsSeenBy(pollId: string, viewerId: string) {
  const access = await getResults({ pollId, viewerId });
  if (access?.status !== "visible") throw new Error(`Results not visible: ${JSON.stringify(access)}`);
  return access.results;
}

// Tries to create the Poll and returns the field errors it was rejected with.
async function rejectionOf(
  question: string,
  options: string[],
  timing: { closingTime?: string; now?: Date } = {},
) {
  try {
    await createPoll({ question, options, creatorId: creatorId(), ...timing });
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
    const results = await currentResults(poll.id);

    expect(results.totalVotes).toBe(1);
    expect(results.options).toEqual([
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
    const results = await currentResults(poll.id);

    expect(results.totalVotes).toBe(3);
    expect(results.options.map((o) => [o.votes, o.percent])).toEqual([
      [2, 67],
      [1, 33],
      [0, 0],
    ]);
  });

  test("a Poll with no Votes shows every Option at 0%", async () => {
    const poll = await pollWith(["바다", "산"]);

    const results = await currentResults(poll.id);

    expect(results.totalVotes).toBe(0);
    expect(results.options.map((o) => [o.votes, o.percent])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test("Results tell a Voter which Option they chose", async () => {
    const poll = await pollWith(["바다", "산"]);
    const mountain = poll.options[1];
    const me = voterId();

    await castVote({ pollId: poll.id, optionId: mountain.id, voterId: me });

    expect((await resultsSeenBy(poll.id, me)).chosenOptionId).toBe(mountain.id);
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
    expect((await currentResults(poll.id)).totalVotes).toBe(0);
    expect((await currentResults(other.id)).totalVotes).toBe(0);
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

describe("One Vote per Voter", () => {
  test("a Voter's second Vote on the same Poll is refused and not counted", async () => {
    const poll = await pollWith(["바다", "산"]);
    const [sea, mountain] = poll.options;
    const me = voterId();

    await castVote({ pollId: poll.id, optionId: sea.id, voterId: me });
    const second = await castVote({ pollId: poll.id, optionId: mountain.id, voterId: me });

    expect(second.status).toBe("already-voted");
    const results = await resultsSeenBy(poll.id, me);
    expect(results.options.map((o) => o.votes)).toEqual([1, 0]);
  });

  test("of two Votes a Voter sends at the same moment, exactly one is counted", async () => {
    const poll = await pollWith(["바다", "산"]);
    const [sea, mountain] = poll.options;
    const me = voterId();

    const statuses = await Promise.all([
      castVote({ pollId: poll.id, optionId: sea.id, voterId: me }),
      castVote({ pollId: poll.id, optionId: mountain.id, voterId: me }),
    ]);

    expect(statuses.map((r) => r.status).sort()).toEqual(["already-voted", "voted"]);
    expect((await currentResults(poll.id)).totalVotes).toBe(1);
  });

  test("the same Voter can still vote on a different Poll", async () => {
    const first = await pollWith(["바다", "산"]);
    const second = await pollWith(["짜장", "짬뽕"]);
    const me = voterId();

    await castVote({ pollId: first.id, optionId: first.options[0].id, voterId: me });
    const result = await castVote({ pollId: second.id, optionId: second.options[0].id, voterId: me });

    expect(result.status).toBe("voted");
  });
});

describe("Who sees Results", () => {
  test("someone who hasn't voted and didn't create the Poll can't see its Results", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId() });

    expect(await getResults({ pollId: poll.id, viewerId: voterId() })).toEqual({ status: "hidden" });
  });

  test("an unknown viewer can't see a Poll's Results", async () => {
    const poll = await pollWith(["바다", "산"]);

    expect(await getResults({ pollId: poll.id })).toEqual({ status: "hidden" });
  });

  test("the Creator can't see an open Poll's Results before voting either", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[1].id, voterId: voterId() });

    expect(await getResults({ pollId: poll.id, viewerId: poll.creatorId })).toEqual({ status: "hidden" });
  });

  test("the Creator can vote on their own Poll and sees their choice", async () => {
    const poll = await pollWith(["바다", "산"]);
    const sea = poll.options[0];

    const vote = await castVote({ pollId: poll.id, optionId: sea.id, voterId: poll.creatorId });

    expect(vote.status).toBe("voted");
    expect((await currentResults(poll.id)).chosenOptionId).toBe(sea.id);
  });

  test("a Voter sees the Results once they have voted", async () => {
    const poll = await pollWith(["바다", "산"]);
    const me = voterId();

    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: me });

    expect((await getResults({ pollId: poll.id, viewerId: me }))?.status).toBe("visible");
  });

  test("Results say they are shown because the viewer has voted", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: poll.creatorId });

    const access = await getResults({ pollId: poll.id, viewerId: poll.creatorId });

    expect(access?.status === "visible" && access.reason).toBe("voted");
  });
});

describe("Closing time", () => {
  test("a Poll created without a Closing time has none and is not Closed", async () => {
    const poll = await pollWith(["바다", "산"]);

    expect(poll.closingTime).toBeNull();
    expect(poll.closed).toBe(false);
  });

  test("a Poll with a future Closing time is open until then and Closed from that moment", async () => {
    const poll = await pollWith(["바다", "산"], {
      closingTime: "2026-10-03T18:00:00+09:00",
      now: new Date("2026-10-01T12:00:00+09:00"),
    });

    expect(poll.closingTime).toEqual(new Date("2026-10-03T09:00:00Z"));
    const closedAt = async (now: string) => (await getPoll(poll.id, { now: new Date(now) }))?.closed;
    expect(await closedAt("2026-10-03T17:59:59.999+09:00")).toBe(false);
    expect(await closedAt("2026-10-03T18:00:00+09:00")).toBe(true);
    expect(await closedAt("2026-10-04T00:00:00+09:00")).toBe(true);
  });

  test.each([
    ["in the past", "2026-10-01T11:59:00+09:00"],
    ["right now", "2026-10-01T12:00:00+09:00"],
  ])("a Closing time %s is rejected", async (_, closingTime) => {
    const errors = await rejectionOf("주말에 어디 갈까요?", ["바다", "산"], {
      closingTime,
      now: new Date("2026-10-01T12:00:00+09:00"),
    });
    expect(errors).toEqual({ closingTime: "마감 시간은 지금보다 뒤여야 해요." });
  });

  test("a Closing time is rejected together with the other field errors", async () => {
    const errors = await rejectionOf("  ", ["바다"], {
      closingTime: "2026-09-30T18:00:00+09:00",
      now: new Date("2026-10-01T12:00:00+09:00"),
    });
    expect(Object.keys(errors).sort()).toEqual(["closingTime", "options", "question"]);
  });

  test.each(["내일 저녁", "2026-13-01T18:00", "2026-10-03", "2027-02-30T10:00", "2027-10-03T24:00"])(
    "a Closing time that can't be read, %j, is rejected",
    async (closingTime) => {
      const errors = await rejectionOf("주말에 어디 갈까요?", ["바다", "산"], { closingTime });
      expect(Object.keys(errors)).toEqual(["closingTime"]);
    },
  );

  test("a Closing time without an offset is read as Korean time", async () => {
    const poll = await pollWith(["바다", "산"], {
      closingTime: "2026-10-03T18:00",
      now: new Date("2026-10-01T12:00:00+09:00"),
    });
    expect(poll.closingTime).toEqual(new Date("2026-10-03T09:00:00Z"));
  });

  test("a blank Closing time means the Poll has none", async () => {
    const poll = await pollWith(["바다", "산"], { closingTime: "" });
    expect(poll.closingTime).toBeNull();
  });
});

describe("Voting after the Closing time", () => {
  const closingTime = "2026-10-03T18:00:00+09:00";
  const beforeClosing = new Date("2026-10-03T17:59:59.999+09:00");
  const atClosing = new Date(closingTime);
  const closingPoll = () =>
    pollWith(["바다", "산"], { closingTime, now: new Date("2026-10-01T12:00:00+09:00") });

  test("a Vote on a Closed Poll is refused and not counted", async () => {
    const poll = await closingPoll();

    const result = await castVote({
      pollId: poll.id,
      optionId: poll.options[0].id,
      voterId: voterId(),
      now: atClosing,
    });

    expect(result.status).toBe("closed");
    expect((await currentResults(poll.id)).totalVotes).toBe(0);
  });

  test("a Voter who voted before the Poll closed is told it is Closed when voting again", async () => {
    const poll = await closingPoll();
    const [sea, mountain] = poll.options;
    const me = voterId();

    await castVote({ pollId: poll.id, optionId: sea.id, voterId: me, now: beforeClosing });
    const again = await castVote({ pollId: poll.id, optionId: mountain.id, voterId: me, now: atClosing });

    expect(again.status).toBe("closed");
    expect((await resultsSeenBy(poll.id, me)).options.map((o) => o.votes)).toEqual([1, 0]);
  });

  test("a Vote just before the Closing time is counted", async () => {
    const poll = await closingPoll();

    const result = await castVote({
      pollId: poll.id,
      optionId: poll.options[1].id,
      voterId: voterId(),
      now: beforeClosing,
    });

    expect(result.status).toBe("voted");
    expect((await currentResults(poll.id)).options.map((o) => o.votes)).toEqual([0, 1]);
  });

  test("a Vote for an Option of another Poll on a Closed Poll is told it is Closed", async () => {
    const poll = await closingPoll();
    const other = await pollWith(["짜장", "짬뽕"]);

    const result = await castVote({
      pollId: poll.id,
      optionId: other.options[0].id,
      voterId: voterId(),
      now: atClosing,
    });

    expect(result.status).toBe("closed");
  });
});


describe("Who sees Results after the Closing time", () => {
  const closingTime = "2026-10-03T18:00:00+09:00";
  const beforeClosing = new Date("2026-10-03T12:00:00+09:00");
  const afterClosing = new Date("2026-10-03T18:00:00+09:00");
  const closingPoll = () =>
    pollWith(["바다", "산"], { closingTime, now: new Date("2026-10-01T12:00:00+09:00") });

  test("someone who never voted sees a Closed Poll's Results because it is Closed", async () => {
    const poll = await closingPoll();
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId(), now: beforeClosing });

    const access = await getResults({ pollId: poll.id, viewerId: voterId(), now: afterClosing });

    expect(access?.status === "visible" && access.reason).toBe("closed");
    expect(access?.status === "visible" && access.results.options.map((o) => o.votes)).toEqual([1, 0]);
  });

  test("a Voter who voted before the Poll closed sees their choice because they voted", async () => {
    const poll = await closingPoll();
    const mountain = poll.options[1];
    const me = voterId();
    await castVote({ pollId: poll.id, optionId: mountain.id, voterId: me, now: beforeClosing });

    const access = await getResults({ pollId: poll.id, viewerId: me, now: afterClosing });

    expect(access?.status === "visible" && access.reason).toBe("voted");
    expect(access?.status === "visible" && access.results.chosenOptionId).toBe(mountain.id);
  });

  test("a Creator who didn't vote sees a Closed Poll's Results because it is Closed", async () => {
    const poll = await closingPoll();

    const access = await getResults({ pollId: poll.id, viewerId: poll.creatorId, now: afterClosing });

    expect(access?.status === "visible" && access.reason).toBe("closed");
  });

  test("before the Closing time, Results are still hidden from anyone who hasn't voted", async () => {
    const poll = await closingPoll();

    for (const viewerId of [voterId(), poll.creatorId]) {
      expect(await getResults({ pollId: poll.id, viewerId, now: beforeClosing })).toEqual({
        status: "hidden",
      });
    }
  });
});

describe("Poll list", () => {
  test("lists a Poll with its question, Vote count and whether it is Closed", async () => {
    const poll = await pollWith(["바다", "산"], {
      closingTime: "2026-10-03T18:00:00+09:00",
      now: new Date("2026-10-01T12:00:00+09:00"),
    });
    for (const optionId of [poll.options[0].id, poll.options[1].id, poll.options[1].id]) {
      await castVote({ pollId: poll.id, optionId, voterId: voterId(), now: new Date("2026-10-02T12:00:00+09:00") });
    }

    const listed = (await listPolls({ now: new Date("2026-10-03T18:00:00+09:00") })).find(
      (p) => p.id === poll.id,
    );

    expect(listed).toEqual({
      id: poll.id,
      question: "어디로 갈까요?",
      totalVotes: 3,
      closingTime: new Date("2026-10-03T09:00:00Z"),
      closed: true,
    });
  });

  test("lists newer Polls first", async () => {
    const older = await pollWith(["바다", "산"]);
    const newer = await pollWith(["바다", "산"]);

    const ids = (await listPolls()).map((p) => p.id);

    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });
});

describe("Deleting a Poll", () => {
  test("a deleted Poll, its Options and its Votes are gone", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId() });

    expect(await deletePoll(poll.id)).toBe(true);

    expect(await getPoll(poll.id)).toBeNull();
    expect(await getResults({ pollId: poll.id, viewerId: poll.creatorId })).toBeNull();
    expect((await listPolls()).some((p) => p.id === poll.id)).toBe(false);
    const vote = await castVote({ pollId: poll.id, optionId: poll.options[1].id, voterId: voterId() });
    expect(vote.status).toBe("poll-not-found");
  });

  test("deleting a Poll leaves other Polls and their Votes alone", async () => {
    const doomed = await pollWith(["바다", "산"]);
    const kept = await pollWith(["짜장", "짬뽕"]);
    await castVote({ pollId: kept.id, optionId: kept.options[1].id, voterId: voterId() });

    await deletePoll(doomed.id);

    expect((await currentResults(kept.id)).options.map((o) => o.votes)).toEqual([0, 1]);
  });

  test("deleting a Poll that doesn't exist reports nothing was deleted", async () => {
    expect(await deletePoll("no-such-poll")).toBe(false);
  });
});

describe("Results for the Operator", () => {
  test("an open Poll's Results are available without voting, with no choice marked", async () => {
    const poll = await pollWith(["바다", "산", "도시"]);
    const [sea, mountain] = poll.options;
    for (const optionId of [sea.id, mountain.id, mountain.id]) {
      await castVote({ pollId: poll.id, optionId, voterId: voterId() });
    }

    expect(await getPollResults(poll.id)).toEqual({
      totalVotes: 3,
      options: [
        { id: sea.id, label: "바다", votes: 1, percent: 33 },
        { id: mountain.id, label: "산", votes: 2, percent: 67 },
        { id: poll.options[2].id, label: "도시", votes: 0, percent: 0 },
      ],
      chosenOptionId: undefined,
    });
  });

  test("reading the Results adds no Vote and leaves the Results hidden from others", async () => {
    const poll = await pollWith(["바다", "산"]);
    await castVote({ pollId: poll.id, optionId: poll.options[0].id, voterId: voterId() });

    await getPollResults(poll.id);
    await getPollResults(poll.id);

    expect((await getPollResults(poll.id))?.totalVotes).toBe(1);
    expect(await getResults({ pollId: poll.id, viewerId: voterId() })).toEqual({ status: "hidden" });
  });

  test("Results of a Poll that doesn't exist are nothing", async () => {
    expect(await getPollResults("no-such-poll")).toBeNull();
  });
});

