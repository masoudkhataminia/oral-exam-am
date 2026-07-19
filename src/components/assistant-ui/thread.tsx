"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardCheckIcon,
  FileSearchIcon,
  ScaleIcon,
  SquareIcon,
  StethoscopeIcon,
} from "lucide-react";
import type { FC } from "react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

type Part = "A" | "B" | "C";

const partCopy: Record<
  Part,
  {
    eyebrow: string;
    title: string;
    description: string;
    examples: Array<{ title: string; detail: string }>;
  }
> = {
  A: {
    eyebrow: "Part A · OTC & Self-care",
    title: "Work through an OTC case",
    description:
      "Paste the scenario or enter a Case ID. The assistant will structure the history, red flags, referral threshold, recommendation and counselling.",
    examples: [
      { title: "Symptom assessment", detail: "Duration, severity, red flags and referral" },
      { title: "Product selection", detail: "Suitability, dose, counselling and follow-up" },
    ],
  },
  B: {
    eyebrow: "Part B · Legal & Ethical",
    title: "Analyse a professional-practice scenario",
    description:
      "Identify the jurisdiction, immediate safety issue, legal requirements, documentation and escalation pathway.",
    examples: [
      { title: "Legal validity", detail: "Prescription, privacy, consent and records" },
      { title: "Professional action", detail: "PIC, supervisor and patient communication" },
    ],
  },
  C: {
    eyebrow: "Part C · Clinical & Prescription",
    title: "Review a clinical prescription case",
    description:
      "Assess indication, dose, interactions, contraindications, monitoring, prescriber contact and patient counselling.",
    examples: [
      { title: "Clinical screening", detail: "Dose, route, duration and organ function" },
      { title: "Final oral answer", detail: "Concise, natural and examination-ready" },
    ],
  },
};

export const OralExamThread: FC<{ part: Part }> = ({ part }) => {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-950">
      <ThreadPrimitive.Viewport className="relative flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth px-4">
        <AuiIf condition={(state) => state.thread.messages.length === 0}>
          <Welcome part={part} />
        </AuiIf>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
          <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
        </div>

        <div className="min-h-6 flex-1" />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto flex w-full max-w-3xl flex-col gap-3 bg-gradient-to-t from-white via-white to-white/0 pb-4 pt-8 dark:from-slate-950 dark:via-slate-950">
          <ThreadScrollToBottom />
          <Composer />
          <p className="px-4 text-center text-[11px] leading-4 text-slate-400">
            Clinical and legal points must be confirmed against the indexed source and current Australian requirements.
          </p>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Welcome: FC<{ part: Part }> = ({ part }) => {
  const copy = partCopy[part];
  const Icon = part === "A" ? ClipboardCheckIcon : part === "B" ? ScaleIcon : StethoscopeIcon;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10">
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="size-6" />
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
        {copy.eyebrow}
      </p>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base dark:text-slate-400">
        {copy.description}
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {copy.examples.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <FileSearchIcon className="size-4 text-emerald-600" />
              {item.title}
            </div>
            <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((state) => state.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
};

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="ml-auto max-w-[88%] rounded-3xl rounded-br-lg bg-slate-900 px-5 py-3 text-sm leading-6 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
    <MessagePrimitive.Parts />
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
    <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
  </MessagePrimitive.Root>
);

const ThreadScrollToBottom: FC = () => (
  <ThreadPrimitive.ScrollToBottom asChild>
    <button
      type="button"
      className="absolute -top-4 self-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900 disabled:invisible dark:border-slate-800 dark:bg-slate-900 dark:hover:text-white"
      aria-label="Scroll to bottom"
    >
      <ArrowDownIcon className="size-4" />
    </button>
  </ThreadPrimitive.ScrollToBottom>
);

const Composer: FC = () => (
  <ComposerPrimitive.Root className="rounded-[26px] border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] focus-within:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
    <ComposerPrimitive.Input
      autoFocus
      rows={1}
      placeholder="Paste the case, enter a Case ID, page number or medicine…"
      className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
      aria-label="Case input"
    />
    <div className="flex items-center justify-between px-1 pb-1">
      <span className="px-2 text-xs text-slate-400">Shift + Enter for a new line</span>
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            type="submit"
            className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Analyse case"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950"
            aria-label="Stop analysis"
          >
            <SquareIcon className="size-3 fill-current" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </ComposerPrimitive.Root>
);
