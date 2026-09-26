import { notFound } from "next/navigation";
import { getPoll, getResults } from "@/lib/polls";
import { readVisitorId } from "@/lib/visitor";
import { CopyLinkButton } from "./copy-link-button";
import { ResultsView } from "./results-view";
import { VoteForm } from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const viewerId = await readVisitorId();
  const [poll, access] = await Promise.all([getPoll(id), getResults({ pollId: id, viewerId })]);
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
      {!hasVoted && <VoteForm pollId={poll.id} options={poll.options} />}
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
