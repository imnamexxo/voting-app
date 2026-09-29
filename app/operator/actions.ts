"use server";

import { redirect } from "next/navigation";
import { endOperatorSession, passwordMatches, startOperatorSession } from "@/lib/operator";

export type SignInState = { error?: string };

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const password = process.env.OPERATOR_PASSWORD;
  if (!password) return { error: "운영자 로그인이 아직 설정되지 않았어요." };
  if (!passwordMatches(String(formData.get("password") ?? ""), password))
    return { error: "비밀번호가 맞지 않아요." };

  await startOperatorSession();
  redirect("/operator");
}

export async function signOutAction(): Promise<void> {
  await endOperatorSession();
  redirect("/");
}
