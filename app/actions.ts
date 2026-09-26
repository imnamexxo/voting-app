"use server";

import { redirect } from "next/navigation";
import { createPoll, PollValidationError, type PollFieldErrors } from "@/lib/polls";
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
