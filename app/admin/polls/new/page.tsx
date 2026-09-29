import Link from "next/link";
import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/polls";
import { CreatePollForm } from "./create-poll-form";

export default async function NewPollPage() {
  if (!(await isOperator())) redirect("/operator/login");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <Link href="/admin" className="text-sm text-zinc-500 underline">
        ← 관리자 대시보드
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">새 투표 만들기</h1>
      <CreatePollForm limits={{ minOptions: MIN_OPTIONS, maxOptions: MAX_OPTIONS }} />
    </main>
  );
}
