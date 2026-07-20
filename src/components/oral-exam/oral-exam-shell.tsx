"use client";

import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  ClipboardIcon,
  Clock3Icon,
  FileSearchIcon,
  HistoryIcon,
  Loader2Icon,
  MenuIcon,
  RefreshCwIcon,
  ScaleIcon,
  SearchIcon,
  SparklesIcon,
  StethoscopeIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getCatalogForPart,
  type CatalogEntry,
  type OralPart,
} from "@/lib/case-catalog";
import { cn } from "@/lib/utils";

type AnalyseResult = {
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

type HistoryItem = AnalyseResult;

const partMeta: Record<
  OralPart,
  {
    label: string;
    title: string;
    subtitle: string;
    icon: typeof ClipboardCheckIcon;
  }
> = {
  A: {
    label: "Part A",
    title: "OTC & Self-care",
    subtitle: "Symptoms, referral and counselling",
    icon: ClipboardCheckIcon,
  },
  B: {
    label: "Part B",
    title: "Legal & Professional Practice",
    subtitle: "Law, ethics, documentation and escalation",
    icon: ScaleIcon,
  },
  C: {
    label: "Part C",
    title: "Clinical & Prescription Review",
    subtitle: "Screening, intervention and monitoring",
    icon: StethoscopeIcon,
  },
};

function formatDate(value?: string) {
  if (!value) return "";
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
  if (!match || match.index === undefined) {
    return { main: answer.trim(), details: "" };
  }

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
          return (
            <h4 key={index} className="pt-2 text-sm font-semibold text-slate-950 dark:text-white">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={index} className="pt-3 text-base font-semibold text-slate-950 dark:text-white">
              {line.slice(3)}
            </h3>
          );
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

export function OralExamShell() {
  const [part, setPart] = useState<OralPart>("A");
  const [caseNumber, setCaseNumber] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [query, setQuery] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [result, setResult] = useState<AnalyseResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const catalog = useMemo(() => getCatalogForPart(part), [part]);
  const filteredCatalog = useMemo(() => {
    const needle = catalogSearch.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog.filter(
      (entry) =>
        entry.caseId.toLowerCase().includes(needle) ||
        entry.title.toLowerCase().includes(needle),
    );
  }, [catalog, catalogSearch]);

  const selectedEntry = useMemo(
    () => catalog.find((entry) => entry.caseId.toLowerCase() === caseNumber.trim().toLowerCase()),
    [catalog, caseNumber],
  );

  const { main: mainAnswer, details: moreDetails } = useMemo(
    () => splitMoreDetails(result?.answer ?? ""),
    [result?.answer],
  );

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/analyse", { cache: "no-store" });
      const payload = (await response.json()) as { items?: HistoryItem[] };
      setHistory(payload.items ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function changePart(nextPart: OralPart) {
    setPart(nextPart);
    setCaseNumber("");
    setItemNumber("");
    setQuery("");
    setCatalogSearch("");
    setResult(null);
    setError("");
    setSidebarOpen(false);
  }

  function selectCatalogEntry(entry: CatalogEntry) {
    setCaseNumber(entry.caseId);
    setCatalogSearch(entry.caseId);
    setQuery(entry.prompt);
    setResult(null);
    setError("");
  }

  function handleCaseNumberChange(value: string) {
    setCaseNumber(value);
    setCatalogSearch(value);
    setResult(null);
    const exact = catalog.find((entry) => entry.caseId.toLowerCase() === value.trim().toLowerCase());
    if (exact) setQuery(exact.prompt);
  }

  function buildSubmittedQuery() {
    const cleanQuery = query.trim();
    if (cleanQuery) return cleanQuery;
    if (part === "B" && caseNumber) return `Part B question ${caseNumber}`;
    if (caseNumber) {
      return `Part ${part}, Case ID ${caseNumber}${itemNumber ? `, Case item ${itemNumber}` : ""}`;
    }
    return "";
  }

  async function analyse(forceRefresh = false) {
    const submittedQuery = buildSubmittedQuery();
    if (!submittedQuery) {
      setError("Select a case or enter the question text first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part,
          caseNumber: caseNumber.trim() || undefined,
          itemNumber: itemNumber.trim() || undefined,
          query: submittedQuery,
          forceRefresh,
        }),
      });
      const payload = (await response.json()) as AnalyseResult;
      if (!response.ok) throw new Error(payload.error || "The answer could not be generated.");
      setResult(payload);
      await loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The answer could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  function openHistoryItem(item: HistoryItem) {
    setPart(item.part);
    setCaseNumber(item.caseNumber ?? "");
    setItemNumber(item.itemNumber ?? "");
    setQuery(item.query);
    setCatalogSearch(item.caseNumber ?? "");
    setResult(item);
    setError("");
    setSidebarOpen(false);
  }

  async function copyAnswer() {
    if (!result?.answer) return;
    await navigator.clipboard.writeText(result.answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const PartIcon = partMeta[part].icon;
  const caseLabel = part === "B" ? "Question number" : "Case number / Case ID";
  const casePlaceholder = part === "B" ? "Type or select 11" : "Type or select a Case ID";

  return (
    <div className="flex min-h-dvh bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close history"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[310px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <SparklesIcon className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">ORAL EXAM AMH</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.17em] text-slate-400">Exam workspace</div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-900"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Exam section</p>
          <div className="space-y-1">
            {(Object.keys(partMeta) as OralPart[]).map((partId) => {
              const meta = partMeta[partId];
              const Icon = meta.icon;
              return (
                <button
                  key={partId}
                  type="button"
                  onClick={() => changePart(partId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                    part === partId
                      ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/70 dark:bg-slate-950/40">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{meta.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] opacity-65">{meta.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved answers</p>
            <HistoryIcon className="size-3.5 text-slate-400" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {historyLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
                <Loader2Icon className="size-3.5 animate-spin" /> Loading saved cases…
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs leading-5 text-slate-400 dark:border-slate-800">
                Generated answers will be saved on the server and appear here.
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openHistoryItem(item)}
                    className="w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.part === "B" ? `B${item.caseNumber ?? ""}` : item.part}
                      </span>
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {item.caseNumber
                          ? item.part === "B"
                            ? `Question ${item.caseNumber}`
                            : `Case ${item.caseNumber}`
                          : "Custom case"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{item.query}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This app is public. Do not enter patient-identifying information.
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-0 lg:p-4 lg:pl-0">
        <section className="min-h-dvh bg-white lg:min-h-[calc(100dvh-2rem)] lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-sm dark:bg-slate-950 lg:dark:border-slate-800">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 px-4 sm:px-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-900"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open saved cases"
              >
                <MenuIcon className="size-5" />
              </button>
              <div>
                <div className="text-sm font-semibold">{partMeta[part].title}</div>
                <div className="text-xs text-slate-400">Australian intern pharmacist oral-exam practice</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:flex dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              <CheckCircle2Icon className="size-3.5" /> Server save enabled
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <PartIcon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Select the source question</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Type a number or ID, or open the ordered list and select it.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(partMeta) as OralPart[]).map((partId) => (
                      <button
                        key={partId}
                        type="button"
                        onClick={() => changePart(partId)}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-left transition",
                          part === partId
                            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-950"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                        )}
                      >
                        <span className="block text-sm font-semibold">{partMeta[partId].label}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{partMeta[partId].title}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{caseLabel}</span>
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          list={`case-options-${part}`}
                          value={caseNumber}
                          onChange={(event) => handleCaseNumberChange(event.target.value)}
                          placeholder={casePlaceholder}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-emerald-950"
                        />
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <datalist id={`case-options-${part}`}>
                          {catalog.map((entry) => (
                            <option key={entry.caseId} value={entry.caseId}>{entry.title}</option>
                          ))}
                        </datalist>
                      </div>
                    </label>

                    {part !== "B" ? (
                      <label className="space-y-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Case item</span>
                        <div className="relative">
                          <input
                            list={`item-options-${part}`}
                            inputMode="numeric"
                            value={itemNumber}
                            onChange={(event) => {
                              setItemNumber(event.target.value);
                              setResult(null);
                            }}
                            placeholder="Type or select item"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-emerald-950"
                          />
                          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <datalist id={`item-options-${part}`}>
                            {Array.from({ length: 10 }, (_, index) => (
                              <option key={index + 1} value={String(index + 1)} />
                            ))}
                          </datalist>
                        </div>
                      </label>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">PDF order</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Questions are kept in the source order from 1 to 171.</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ordered source list</p>
                        <p className="text-[11px] text-slate-400">Search by number, Case ID or question wording.</p>
                      </div>
                      <span className="text-[11px] text-slate-400">{filteredCatalog.length} items</span>
                    </div>
                    <div className="relative mb-2">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={catalogSearch}
                        onChange={(event) => setCatalogSearch(event.target.value)}
                        placeholder={part === "B" ? "Search 11 or type part of the scenario" : "Search Case ID or scenario"}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                      {filteredCatalog.slice(0, 80).map((entry) => (
                        <button
                          key={`${entry.part}-${entry.caseId}`}
                          type="button"
                          onClick={() => selectCatalogEntry(entry)}
                          className={cn(
                            "flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition",
                            caseNumber.toLowerCase() === entry.caseId.toLowerCase()
                              ? "bg-emerald-100/80 dark:bg-emerald-950/60"
                              : "hover:bg-white dark:hover:bg-slate-900",
                          )}
                        >
                          <span className="mt-0.5 min-w-10 rounded-md bg-white px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                            {entry.caseId}
                          </span>
                          <span className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{entry.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Question or case text</h2>
                    <p className="mt-1 text-xs text-slate-400">Review, paste or edit the exact wording before generating.</p>
                  </div>
                  {selectedEntry && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Source selected
                    </span>
                  )}
                </div>
                <textarea
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setResult(null);
                  }}
                  rows={10}
                  placeholder="Select a source question above or paste a new case here…"
                  className="min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/60 dark:focus:bg-slate-950 dark:focus:ring-emerald-950"
                />

                {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileSearchIcon className="size-4" />
                    Existing server answer is reused unless Refresh is pressed.
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void analyse(false)}
                    className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                    Generate answer
                  </button>
                </div>
              </section>
            </div>

            <div className="xl:sticky xl:top-4 xl:self-start">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div>
                    <h2 className="text-sm font-semibold">Exam-ready answer</h2>
                    <p className="mt-1 text-xs text-slate-400">Complete enough for full marks, without unnecessary detail.</p>
                  </div>
                  {result && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copyAnswer()}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
                        aria-label="Copy answer"
                      >
                        {copied ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <ClipboardIcon className="size-4" />}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void analyse(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
                        Refresh
                      </button>
                    </div>
                  )}
                </div>

                {!result ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center px-8 py-14 text-center">
                    <div className="flex size-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                      <BookOpenIcon className="size-6" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold">Your answer will appear here</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                      Select the Part and source question, review the case wording, then generate the answer.
                    </p>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 font-medium",
                        result.cached
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                      )}>
                        {result.cached ? "Saved answer" : "Fresh answer"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        Version {result.version}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock3Icon className="size-3" /> {formatDate(result.updatedAt)}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <AnswerText text={mainAnswer} />
                    </div>

                    <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className="flex items-center gap-2">
                          <BookOpenIcon className="size-4 text-emerald-600" />
                          More details
                        </span>
                        <ChevronDownIcon className="size-4 text-slate-400 transition group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                        {moreDetails ? (
                          <AnswerText text={moreDetails} />
                        ) : (
                          <p className="text-sm leading-6 text-slate-400">
                            Educational reasoning is not available in this saved version. Press Refresh to regenerate it using the current answer format.
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
