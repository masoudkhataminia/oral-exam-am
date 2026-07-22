"use client";

import {
  AlertTriangleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClipboardIcon,
  Clock3Icon,
  FileSearchIcon,
  Loader2Icon,
  RefreshCwIcon,
  SquareIcon,
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
  warning?: string;
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
  streamedAnswer,
  streamStatus,
  liveSources,
  onCancel,
  onRefresh,
}: {
  result: AnalyseResult | null;
  loading: boolean;
  streamedAnswer: string;
  streamStatus: string;
  liveSources: string[];
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const displayAnswer = streamedAnswer || result?.answer || "";
  const sections = useMemo(() => splitMoreDetails(displayAnswer), [displayAnswer]);
  const displayedSources = useMemo(() => {
    const sources = liveSources.length > 0
      ? liveSources
      : (result?.sources ?? []).map((source) => source.filename);
    return [...new Set(sources)];
  }, [liveSources, result?.sources]);

  async function copyAnswer() {
    if (!displayAnswer) return;
    await navigator.clipboard.writeText(displayAnswer);
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
        <div className="flex items-center gap-2">
          {displayAnswer && !loading && (
            <button
              type="button"
              onClick={() => void copyAnswer()}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Copy answer"
            >
              {copied ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <ClipboardIcon className="size-4" />}
            </button>
          )}
          {loading ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <SquareIcon className="size-3 fill-current" /> Stop
            </button>
          ) : result ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCwIcon className="size-3.5" /> Refresh
            </button>
          ) : null}
        </div>
      </div>

      {loading && (
        <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {streamStatus || "Analysing the case…"}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/70 dark:text-emerald-300/70">
                The request can be stopped at any time. A saved answer is returned without a new API call.
              </p>
            </div>
          </div>
        </div>
      )}

      {displayedSources.length > 0 && (
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <FileSearchIcon className="size-3.5" /> Retrieved sources
          </div>
          <div className="flex flex-wrap gap-2">
            {displayedSources.map((source) => (
              <span
                key={source}
                title={source}
                className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {!displayAnswer ? (
        <div className="flex min-h-[500px] flex-col items-center justify-center px-8 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            {loading ? <Loader2Icon className="size-6 animate-spin" /> : <BookOpenIcon className="size-6" />}
          </div>
          <h3 className="mt-5 text-base font-semibold">
            {loading ? "Building your answer" : "Your answer will appear here"}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
            {loading
              ? streamStatus || "Searching evidence and preparing a structured response."
              : "Select the Part and source question, review the wording, then generate the answer."}
          </p>
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
            {streamedAnswer ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                Live answer
              </span>
            ) : result ? (
              <>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium",
                    result.version === 0
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                      : result.cached
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                  )}
                >
                  {result.version === 0 ? "Preview · not saved" : result.cached ? "Saved answer" : "Fresh answer"}
                </span>
                {result.version > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    Version {result.version}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Clock3Icon className="size-3" /> {formatDate(result.updatedAt)}
                </span>
              </>
            ) : null}
          </div>

          {result?.warning && !streamedAnswer && (
            <div className="mb-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{result.warning}</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <AnswerText text={sections.main} />
          </div>

          <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-2"><BookOpenIcon className="size-4 text-emerald-600" /> More details</span>
              <ChevronDownIcon className="size-4 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
              {sections.details ? (
                <AnswerText text={sections.details} />
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  {loading
                    ? "Educational reasoning and examiner follow-up points will appear when validation is complete."
                    : "Educational reasoning is not available in this saved version. Press Refresh to regenerate it."}
                </p>
              )}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
