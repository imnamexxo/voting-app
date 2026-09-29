import { notFound } from "next/navigation";
import { getPoll, getResults } from "@/lib/polls";
import { readVisitorId } from "@/lib/visitor";
import { CopyLinkButton } from "./copy-link-button";
import { formatClosingTime } from "./format-closing-time";
import { ResultsView } from "./results-view";
import { VoteForm } from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const viewerId = await readVisitorId();
  // One moment for both calls, so they agree on whether the Poll is Closed.
  const now = new Date();
  const [poll, access] = await Promise.all([
    getPoll(id, { now }),
    getResults({ pollId: id, viewerId, now }),
  ]);
  if (!poll || !access) notFound();

  // Who may see the Results is decided by the Poll module. Only visible Results reach the page,
  // so hidden counts never end up in the HTML.
  const hasVoted = access.status === "visible" && access.reason === "voted";

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold break-words">{poll.question}</h1>
      <div className="mt-4">
        <CopyLinkButton pollId={poll.id} />
      </div>
      {poll.closed ? (
        <div className="mt-8 rounded-md border border-zinc-300 px-4 py-3 dark:border-zinc-700">
          <p className="font-medium">투표가 마감되었어요</p>
          {poll.closingTime && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatClosingTime(poll.closingTime)}에 마감되었어요.
            </p>
          )}
        </div>
      ) : (
        <>
          {poll.closingTime && (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {formatClosingTime(poll.closingTime)}까지 투표할 수 있어요
            </p>
          )}
          {!hasVoted && <VoteForm pollId={poll.id} options={poll.options} />}
        </>
      )}
      {access.status === "visible" && (
        <>
          {access.reason === "creator" && (
            <p className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
              내가 만든 투표라서 투표하기 전에도 결과를 볼 수 있어요.
            </p>
          )}
          <ResultsView results={access.results} />
        </>
      )}
    </main>
  );
}
