"use server";

import { notFound, redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { castVote, createPoll, PollValidationError, type PollFieldErrors } from "@/lib/polls";
import { getOrIssueVisitorId } from "@/lib/visitor";

export type CreatePollState = {
  errors?: PollFieldErrors;
  // What was submitted, so the form can be refilled even without JavaScript.
  // closingTime is the datetime-local field's own value, without an offset.
  submitted?: { question: string; options: string[]; closingTime: string };
};

export async function createPollAction(
  _prev: CreatePollState,
  formData: FormData,
): Promise<CreatePollState> {
  // Only the Operator makes Polls. The page checks too, but a Server Action can be called
  // directly, so it checks for itself.
  if (!(await isOperator())) redirect("/operator/login");

  const submitted = {
    question: String(formData.get("question") ?? ""),
    options: formData.getAll("option").map(String),
    closingTime: String(formData.get("closingTimeLocal") ?? ""),
  };
  // With JavaScript on, the form also sends the same time with the browser's UTC offset.
  // Without it only the local value arrives, and the Poll module reads that as Korean time.
  const closingTime = String(formData.get("closingTime") ?? "") || submitted.closingTime;

  let pollId: string;
  try {
    pollId = await createPoll({
      ...submitted,
      closingTime,
      creatorId: await getOrIssueVisitorId(),
    });
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
  // Results with the Voter's one counted Vote highlighted. So does "closed": the page then says
  // the Poll is Closed instead of showing the vote form.
  redirect(`/polls/${pollId}`);
}
