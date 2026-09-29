import Link from "next/link";
import { connection } from "next/server";
import { listPolls } from "@/lib/polls";
import { PollList } from "./poll-list";

export default async function Home() {
  // The list changes as Polls are made, so render it per request instead of at build time.
  await connection();
  const polls = await listPolls();

  return (
    <>
      {/* The Operator signs in from the list; Voters' pages don't show the link. */}
      <header className="flex justify-end px-4 pt-4">
        <Link href="/operator/login" className="text-sm text-zinc-500 underline">
          운영자 로그인
        </Link>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">투표 목록</h1>
        <PollList polls={polls} />
      </main>
    </>
  );
}
