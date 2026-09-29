"use server";

import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { deletePoll } from "@/lib/polls";

export async function deletePollAction(formData: FormData): Promise<void> {
  // A Server Action can be called directly, so it checks for the Operator itself.
  if (!(await isOperator())) redirect("/operator/login");

  // A Poll that is already gone, say deleted from another tab, ends the same way.
  await deletePoll(String(formData.get("pollId") ?? ""));
  redirect("/admin");
}
