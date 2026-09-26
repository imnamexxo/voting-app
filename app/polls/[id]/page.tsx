import { notFound } from "next/navigation";
import { getPoll, getResults } from "@/lib/polls";
import { readVisitorId } from "@/lib/visitor";
import { ResultsView } from "./results-view";
import { VoteForm } from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const viewerId = await readVisitorId();
  const [poll, results] = await Promise.all([getPoll(id), getResults({ pollId: id, viewerId })]);
  if (!poll || !results) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{poll.question}</h1>
      {results.chosenOptionId ? (
        <ResultsView results={results} />
      ) : (
        <VoteForm pollId={poll.id} options={poll.options} />
      )}
    </main>
  );
}
