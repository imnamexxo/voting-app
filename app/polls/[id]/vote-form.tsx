"use client";

import { useActionState } from "react";
import { castVoteAction, type CastVoteState } from "@/app/actions";
import type { Option } from "@/lib/polls";

export function VoteForm({ pollId, options }: { pollId: string; options: Option[] }) {
  const [state, formAction, pending] = useActionState<CastVoteState, FormData>(
    castVoteAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="pollId" value={pollId} />
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="sr-only">선택지</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-300 px-3 py-2 has-[:checked]:border-foreground dark:border-zinc-700"
          >
            <input type="radio" name="optionId" value={option.id} required className="shrink-0" />
            <span className="min-w-0 break-words">{option.label}</span>
          </label>
        ))}
      </fieldset>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "투표하는 중…" : "투표하기"}
      </button>
    </form>
  );
}
