"use server";

import { notFound, redirect } from "next/navigation";
import { castVote, createPoll, PollValidationError, type PollFieldErrors } from "@/lib/polls";
import { getOrIssueVisitorId } from "@/lib/visitor";

export type CreatePollState = {
  errors?: PollFieldErrors;
  // What was submitted, so the form can be refilled even without JavaScript.
  submitted?: { question: string; options: string[] };
};

export async function createPollAction(
  _prev: CreatePollState,
  formData: FormData,
): Promise<CreatePollState> {
  const submitted = {
    question: String(formData.get("question") ?? ""),
    options: formData.getAll("option").map(String),
  };

  let pollId: string;
  try {
    pollId = await createPoll({ ...submitted, creatorId: await getOrIssueVisitorId() });
  } catch (err) {
    if (err instanceof PollValidationError) return { errors: err.fieldErrors, submitted };
    throw err;
  }

  // redirect() works by throwing, so it stays outside the try.
  redirect(`/polls/${pollId}`);
}

export type CastVoteState = { error?: string };

export async function castVoteAction(
  _prev: CastVoteState,
  formData: FormData,
): Promise<CastVoteState> {
  const pollId = String(formData.get("pollId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  if (optionId === "") return { error: "선택지를 하나 골라 주세요." };

  const result = await castVote({ pollId, optionId, voterId: await getOrIssueVisitorId() });
  if (result.status === "poll-not-found") notFound();
  if (result.status === "option-not-in-poll") return { error: "이 투표에 없는 선택지예요. 다시 골라 주세요." };

  // "voted" and "already-voted" both end the same way: reload the Poll page, which shows the
  // Results with the Voter's one counted Vote highlighted.
  redirect(`/polls/${pollId}`);
}
