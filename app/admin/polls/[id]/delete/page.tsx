import Link from "next/link";
import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { getPoll } from "@/lib/polls";
import { deletePollAction } from "../../../actions";

// Deleting can't be undone, so the dashboard's 삭제 button leads here to confirm first. A page
// rather than a browser dialog, so the confirmation also works without JavaScript.
export default async function DeletePollPage({ params }: PageProps<"/admin/polls/[id]/delete">) {
  if (!(await isOperator())) redirect("/operator/login");
  const { id } = await params;
  const poll = await getPoll(id);
  // Already deleted, say by going back after deleting it: nothing left to confirm.
  if (!poll) redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">이 투표를 삭제할까요?</h1>
      <p className="mt-6 rounded-md border border-zinc-300 px-4 py-3 font-medium break-words dark:border-zinc-700">
        {poll.question}
      </p>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        선택지와 모든 표도 함께 삭제되고, 되돌릴 수 없어요.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={deletePollAction}>
          <input type="hidden" name="pollId" value={poll.id} />
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white dark:bg-red-500"
          >
            삭제
          </button>
        </form>
        <Link
          href="/admin"
          className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          취소
        </Link>
      </div>
    </main>
  );
}
