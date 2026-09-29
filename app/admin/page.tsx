import Link from "next/link";
import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { listPolls } from "@/lib/polls";
import { signOutAction } from "../operator/actions";
import { PollList } from "../poll-list";

export default async function AdminPage() {
  if (!(await isOperator())) redirect("/operator/login");
  const polls = await listPolls();

  return (
    <>
      {/* Leaving for the public list keeps the Operator signed in; 로그아웃 ends the session. */}
      <nav className="flex justify-end gap-4 px-4 pt-4 text-sm text-zinc-500">
        <Link href="/" className="underline">
          투표 목록
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="cursor-pointer underline">
            로그아웃
          </button>
        </form>
      </nav>
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">관리자 대시보드</h1>
          <Link
            href="/admin/polls/new"
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
          >
            새 Poll 만들기
          </Link>
        </div>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">운영자로 로그인했어요.</p>
        <PollList polls={polls} forOperator />
      </main>
    </>
  );
}
