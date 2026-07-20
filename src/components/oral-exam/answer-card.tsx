"use client";

import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClipboardIcon,
  Clock3Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { OralPart } from "@/lib/case-catalog";

export type AnalyseResult = {
  key: string;
  part: OralPart;
  caseNumber?: string;
  itemNumber?: string;
  query: string;
  answer: string;
  cached: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  mode?: string;
  sources?: Array<{ filename: string; score?: number }>;
  error?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function splitMoreDetails(answer: string) {
  const match = answer.match(/^##\s+More details\s*$/im);
  if (!match || match.index === undefined) return { main: answer.trim(), details: "" };

  return {
    main: answer.slice(0, match.index).trim(),
    details: answer.slice(match.index + match[0].length).trim(),
  };
}

function AnswerText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
      {text.split("\n").map((rawLine, index) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) return <div key={index} className="h-1" />;
        if (line.startsWith("### ")) {
          return <h4 key={index} className="pt-2 text-sm font-semibold text-slate-950 dark:text-white">{line.slice(4)}</h4>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={index} className="pt-3 text-base font-semibold text-slate-950 dark:text-white">{line.slice(3)}</h3>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export function AnswerCard({
  result,
  loading,
  onRefresh,
}: {
  result: AnalyseResult | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const sections = useMemo(() => splitMoreDetails(result?.answer ?? ""), [result?.answer]);

  async function copyAnswer() {
    if (!result?.answer) return;
    await navigator.clipboard.writeText(result.answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <h2 className="text-sm font-semibold">Exam-ready answer</h2>
          <p className="mt-1 text-xs text-slate-400">Full-mark points only, without unnecessary detail.</p>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void copyAnswer()} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Copy answer">
              {copied ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <ClipboardIcon className="size-4" />}
            </button>
            <button type="button" disabled={loading} onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        )}
      </div>

      {!result ? (
        <div className="flex min-h-[500px] flex-col items-center justify-center px-8 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            <BookOpenIcon className="size-6" />
          </div>
          <h3 className="mt-5 text-base font-semibold">Your answer will appear here</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Select the Part and source question, review the wording, then generate the answer.</p>
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn("rounded-full px-2.5 py-1 font-medium", result.cached ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300")}>
              {result.cached ? "Saved answer" : "Fresh answer"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">Version {result.version}</span>
            <span className="inline-flex items-center gap-1 text-slate-400"><Clock3Icon className="size-3" /> {formatDate(result.updatedAt)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <AnswerText text={sections.main} />
          </div>

          <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-2"><BookOpenIcon className="size-4 text-emerald-600" /> More details</span>
              <ChevronDownIcon className="size-4 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
              {sections.details ? <AnswerText text={sections.details} /> : <p className="text-sm leading-6 text-slate-400">Educational reasoning is not available in this saved version. Press Refresh to regenerate it.</p>}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
