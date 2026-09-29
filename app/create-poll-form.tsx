"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createPollAction, type CreatePollState } from "./actions";

type Limits = { minOptions: number; maxOptions: number };

const inputClass =
  "w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 dark:text-red-400">{message}</p>;
}

type OptionRow = { id: number; label: string };

const toRows = (labels: string[]): OptionRow[] => labels.map((label, id) => ({ id, label }));

// False while rendering on the server and hydrating, true once JavaScript runs in the browser.
const noSubscription = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

// Adds the browser's UTC offset at that moment to a datetime-local value, so the server gets
// the time the Creator meant wherever they are. Returns "" for a blank or incomplete value.
function withBrowserOffset(local: string): string {
  const date = new Date(local); // A datetime-local value is parsed as the browser's local time.
  if (local === "" || Number.isNaN(date.getTime())) return "";
  const minutes = -date.getTimezoneOffset();
  const pad = (n: number) => String(n).padStart(2, "0");
  const abs = Math.abs(minutes);
  return `${local}${minutes < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function CreatePollForm({ limits }: { limits: Limits }) {
  const [state, formAction, pending] = useActionState<CreatePollState, FormData>(
    createPollAction,
    {},
  );
  // Controlled fields, so what was typed survives a rejected submit. The initial values come
  // from the action state so a rejected submit without JavaScript is refilled too.
  const [question, setQuestion] = useState(() => state.submitted?.question ?? "");
  const [rows, setRows] = useState<OptionRow[]>(() =>
    toRows(
      state.submitted?.options.length
        ? state.submitted.options
        : Array(limits.minOptions).fill(""),
    ),
  );
  const [closingTime, setClosingTime] = useState(() => state.submitted?.closingTime ?? "");
  const isClient = useIsClient();
  // Per-Option errors point at positions in the last submit, so removing an Option makes them
  // point at the wrong fields. Hide them until the next submit returns a fresh state.
  const [staleState, setStaleState] = useState<CreatePollState | null>(null);
  const errors = state.errors ?? {};
  const optionErrors = staleState === state ? {} : (errors.eachOption ?? {});

  const setLabel = (id: number, label: string) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, label } : row)));
  const addRow = () =>
    setRows((prev) => [...prev, { id: Math.max(-1, ...prev.map((r) => r.id)) + 1, label: "" }]);
  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    setStaleState(state);
  };

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-medium">질문</span>
        <input
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          aria-invalid={Boolean(errors.question)}
          className={inputClass}
          placeholder="예: 점심 뭐 먹을까요?"
        />
        <FieldError message={errors.question} />
      </label>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-medium">선택지</legend>
        {rows.map((row, i) => (
          <div key={row.id} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                name="option"
                value={row.label}
                onChange={(e) => setLabel(row.id, e.target.value)}
                required
                aria-label={`선택지 ${i + 1}`}
                aria-invalid={Boolean(optionErrors[i])}
                className={inputClass}
                placeholder={`선택지 ${i + 1}`}
              />
              {rows.length > limits.minOptions && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`선택지 ${i + 1} 삭제`}
                  className="shrink-0 rounded-md border border-zinc-300 px-3 dark:border-zinc-700"
                >
                  ✕
                </button>
              )}
            </div>
            <FieldError message={optionErrors[i]} />
          </div>
        ))}
        <FieldError message={errors.options} />
        {rows.length < limits.maxOptions && (
          <button type="button" onClick={addRow} className="self-start text-sm underline">
            + 선택지 추가
          </button>
        )}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-medium">
          마감 시간 <span className="font-normal text-zinc-500">(선택)</span>
        </span>
        <input
          type="datetime-local"
          name="closingTimeLocal"
          value={closingTime}
          onChange={(e) => setClosingTime(e.target.value)}
          aria-invalid={Boolean(errors.closingTime)}
          aria-describedby="closing-time-hint"
          className={inputClass}
        />
        <span id="closing-time-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          비워 두면 마감 없이 계속 열려 있어요.
        </span>
        <FieldError message={errors.closingTime} />
      </label>
      {isClient && (
        <input type="hidden" name="closingTime" value={withBrowserOffset(closingTime)} />
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "만드는 중…" : "투표 만들기"}
      </button>
    </form>
  );
}
