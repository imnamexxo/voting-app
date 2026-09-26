"use server";

import { redirect } from "next/navigation";
import { createPoll } from "@/lib/polls";
import { getOrIssueVisitorId } from "@/lib/visitor";

export async function createPollAction(formData: FormData) {
  const question = String(formData.get("question") ?? "");
  // The form has spare Option fields; ones left blank aren't Options.
  const options = formData
    .getAll("option")
    .map(String)
    .filter((label) => label.trim() !== "");

  const pollId = await createPoll({
    question,
    options,
    creatorId: await getOrIssueVisitorId(),
  });

  redirect(`/polls/${pollId}`);
}
