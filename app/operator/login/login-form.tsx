"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-medium">비밀번호</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(state.error)}
          className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "확인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
