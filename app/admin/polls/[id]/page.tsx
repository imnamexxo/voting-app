import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { getPoll, getPollResults } from "@/lib/polls";
import { formatClosingTime } from "../../../polls/[id]/format-closing-time";
import { ResultsView } from "../../../polls/[id]/results-view";

// The Operator sees a Poll's current Results without voting, open or Closed. Only reads.
export default async function AdminPollPage({ params }: PageProps<"/admin/polls/[id]">) {
  if (!(await isOperator())) redirect("/operator/login");
  const { id } = await params;
  const [poll, results] = await Promise.all([getPoll(id), getPollResults(id)]);
  if (!poll || !results) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <Link href="/admin" className="text-sm text-zinc-500 underline">
        ← 관리자 대시보드
      </Link>
      <h1 className="mt-4 text-2xl font-semibold break-words">{poll.question}</h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {poll.closed
          ? `${poll.closingTime ? formatClosingTime(poll.closingTime) + "에 " : ""}마감되었어요.`
          : poll.closingTime
            ? `${formatClosingTime(poll.closingTime)}까지 투표할 수 있어요. 지금까지의 결과예요.`
            : "마감 없이 열려 있어요. 지금까지의 결과예요."}
      </p>
      <ResultsView results={results} />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/polls/${poll.id}`}
          className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          투표 페이지 보기
        </Link>
        <Link
          href={`/admin/polls/${poll.id}/delete`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-red-600 dark:border-zinc-700 dark:text-red-400"
        >
          삭제
        </Link>
      </div>
    </main>
  );
}
