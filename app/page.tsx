import { createPollAction } from "./actions";

const OPTION_FIELD_COUNT = 4;
const MIN_OPTIONS = 2;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">새 투표 만들기</h1>

      <form action={createPollAction} className="mt-8 flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="font-medium">질문</span>
          <input
            name="question"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="예: 점심 뭐 먹을까요?"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">선택지</legend>
          {Array.from({ length: OPTION_FIELD_COUNT }, (_, i) => (
            <input
              key={i}
              name="option"
              required={i < MIN_OPTIONS}
              aria-label={`선택지 ${i + 1}`}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={`선택지 ${i + 1}${i < MIN_OPTIONS ? "" : " (선택 사항)"}`}
            />
          ))}
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          투표 만들기
        </button>
      </form>
    </main>
  );
}
