import type { Results } from "@/lib/polls";

export function ResultsView({ results }: { results: Results }) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {results.options.map((option) => {
          const chosen = option.id === results.chosenOptionId;
          return (
            <li key={option.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`min-w-0 break-words ${chosen ? "font-semibold" : ""}`}>
                  {option.label}
                  {chosen && <span className="ml-2 text-sm text-zinc-500">내 선택</span>}
                </span>
                <span className="shrink-0 tabular-nums text-sm text-zinc-600 dark:text-zinc-400">
                  {option.votes}표 · {option.percent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-2 rounded-full ${chosen ? "bg-foreground" : "bg-zinc-400 dark:bg-zinc-500"}`}
                  style={{ width: `${option.percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">총 {results.totalVotes}표</p>
    </section>
  );
}
