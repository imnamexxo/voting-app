import { notFound } from "next/navigation";
import { getPoll } from "@/lib/polls";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{poll.question}</h1>
      <ul className="mt-8 flex flex-col gap-2">
        {poll.options.map((option) => (
          <li
            key={option.id}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
          >
            {option.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
