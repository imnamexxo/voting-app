import Link from "next/link";
import type { PollSummary } from "@/lib/polls";
import { formatClosingTime } from "./polls/[id]/format-closing-time";

// On pages anyone can open, Vote counts would reveal Results before people vote.
// Vote counts and the delete button are only for the Operator's dashboard.
export function PollList({
  polls,
  forOperator = false,
}: {
  polls: PollSummary[];
  forOperator?: boolean;
}) {
  if (polls.length === 0)
    return <p className="mt-8 text-zinc-600 dark:text-zinc-400">아직 투표가 없어요.</p>;

  return (
    <ul className="mt-8 flex flex-col gap-3">
      {polls.map((poll) => (
        <li key={poll.id} className="flex items-stretch gap-2">
          <Link
            // The Operator goes to the Poll's Results; everyone else to the Poll itself.
            href={forOperator ? `/admin/polls/${poll.id}` : `/polls/${poll.id}`}
            className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-zinc-300 px-4 py-3 hover:border-foreground dark:border-zinc-700"
          >
            <span className="min-w-0 break-words font-medium">{poll.question}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {poll.closed
                ? "마감됨"
                : poll.closingTime
                  ? `${formatClosingTime(poll.closingTime)}까지`
                  : "마감 없음"}
              {forOperator && ` · 총 ${poll.totalVotes}표`}
            </span>
          </Link>
          {forOperator && (
            <Link
              href={`/admin/polls/${poll.id}/delete`}
              aria-label={`${poll.question} 삭제`}
              className="flex shrink-0 items-center rounded-md border border-zinc-300 px-3 text-sm text-red-600 hover:border-red-600 dark:border-zinc-700 dark:text-red-400"
            >
              삭제
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
