import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/polls";
import { CreatePollForm } from "./create-poll-form";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">새 투표 만들기</h1>
      <CreatePollForm
        limits={{ minOptions: MIN_OPTIONS, maxOptions: MAX_OPTIONS }}
      />
    </main>
  );
}
