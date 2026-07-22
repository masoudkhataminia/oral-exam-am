"use client";

import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileSearchIcon,
  HistoryIcon,
  Loader2Icon,
  ScaleIcon,
  SearchIcon,
  SparklesIcon,
  SquareIcon,
  StethoscopeIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerCard, type AnalyseResult } from "@/components/oral-exam/answer-card";
import {
  streamAnalysis,
  type AnalysisStreamEvent,
} from "@/lib/analysis-stream-client";
import { getCatalogForPart, type CatalogEntry, type OralPart } from "@/lib/case-catalog";
import { cn } from "@/lib/utils";

const partMeta: Record<
  OralPart,
  { label: string; title: string; subtitle: string; icon: typeof ClipboardCheckIcon }
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
    subtitle: "Law, ethics, records and escalation",
    icon: ScaleIcon,
  },
  C: {
    label: "Part C",
    title: "Clinical & Prescription Review",
    subtitle: "Screening, intervention and monitoring",
    icon: StethoscopeIcon,
  },
};

export function ExamWorkspace() {
  const activeRequest = useRef<AbortController | null>(null);
  const [part, setPart] = useState<OralPart>("A");
  const [caseNumber, setCaseNumber] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [query, setQuery] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [result, setResult] = useState<AnalyseResult | null>(null);
  const [history, setHistory] = useState<AnalyseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState("");
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [liveSources, setLiveSources] = useState<string[]>([]);
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

  useEffect(() => {
    void loadHistory();
    return () => activeRequest.current?.abort();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/analyse", { cache: "no-store" });
      const payload = (await response.json()) as { items?: AnalyseResult[] };
      setHistory(payload.items ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function clearLiveState() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
    setStreamStatus("");
    setStreamedAnswer("");
    setLiveSources([]);
  }

  function changePart(nextPart: OralPart) {
    clearLiveState();
    setPart(nextPart);
    setCaseNumber("");
    setItemNumber("");
    setQuery("");
    setCatalogSearch("");
    setResult(null);
    setError("");
  }

  function selectEntry(entry: CatalogEntry) {
    clearLiveState();
    setCaseNumber(entry.caseId);
    setItemNumber("");
    setCatalogSearch(entry.caseId);
    setQuery(entry.prompt);
    setResult(null);
    setError("");
  }

  function handleCaseInput(value: string) {
    clearLiveState();
    setCaseNumber(value);
    setCatalogSearch(value);
    setResult(null);
    setError("");
    const exact = catalog.find(
      (entry) => entry.caseId.toLowerCase() === value.trim().toLowerCase(),
    );
    if (exact) setQuery(exact.prompt);
  }

  function submittedQuery() {
    if (query.trim()) return query.trim();
    if (part === "B" && caseNumber) return `Part B question ${caseNumber}`;
    if (caseNumber) {
      return `Part ${part}, Case ID ${caseNumber}${itemNumber ? `, Case item ${itemNumber}` : ""}`;
    }
    return "";
  }

  function cancelAnalysis() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
    setStreamStatus("Analysis stopped.");
  }

  async function analyse(forceRefresh = false) {
    const finalQuery = submittedQuery();
    if (!finalQuery) {
      setError("Select a case or enter the question text first.");
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError("");
    setStreamStatus("Starting analysis…");
    setStreamedAnswer("");
    setLiveSources([]);

    try {
      await streamAnalysis(
        {
          part,
          caseNumber: caseNumber.trim() || undefined,
          itemNumber: itemNumber.trim() || undefined,
          query: finalQuery,
          forceRefresh,
        },
        {
          signal: controller.signal,
          async onEvent(event: AnalysisStreamEvent) {
            if (event.type === "status") {
              setStreamStatus(event.message);
              return;
            }

            if (event.type === "source") {
              setLiveSources((current) =>
                current.includes(event.source.filename)
                  ? current
                  : [...current, event.source.filename],
              );
              return;
            }

            if (event.type === "answer_delta") {
              setStreamedAnswer((current) => current + event.delta);
              return;
            }

            if (event.type === "complete") {
              setResult(event.result as AnalyseResult);
              setStreamedAnswer("");
              setStreamStatus("");
              if (event.result.version > 0) await loadHistory();
              return;
            }

            if (event.type === "cancelled") {
              setStreamStatus("Analysis stopped.");
              return;
            }

            if (event.type === "error") throw new Error(event.message);
          },
        },
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        setStreamStatus("Analysis stopped.");
      } else {
        setError(caught instanceof Error ? caught.message : "The answer could not be generated.");
        setStreamStatus("");
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setLoading(false);
    }
  }

  function openSaved(item: AnalyseResult) {
    clearLiveState();
    setPart(item.part);
    setCaseNumber(item.caseNumber ?? "");
    setItemNumber(item.itemNumber ?? "");
    setCatalogSearch(item.caseNumber ?? "");
    setQuery(item.query);
    setResult(item);
    setError("");
  }

  const caseLabel = part === "B" ? "Question number" : "Case number / Case ID";
  const casePlaceholder = part === "B" ? "Type or select 11" : "Type or select a Case ID";

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <SparklesIcon className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">ORAL EXAM AMH</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Australian intern pharmacist workspace
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:flex dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2Icon className="size-3.5" /> Public · server save enabled
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-4 sm:p-6 xl:grid-cols-[260px_minmax(0,1fr)_minmax(390px,0.82fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Exam section
            </p>
            <div className="space-y-1">
              {(Object.keys(partMeta) as OralPart[]).map((id) => {
                const meta = partMeta[id];
                const Icon = meta.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changePart(id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                      part === id
                        ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/70 dark:bg-slate-950/40">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{meta.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] opacity-65">{meta.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved answers</p>
              <HistoryIcon className="size-3.5 text-slate-400" />
            </div>
            <div className="max-h-[430px] space-y-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
                  <Loader2Icon className="size-3.5 animate-spin" /> Loading…
                </div>
              ) : history.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs leading-5 text-slate-400 dark:border-slate-800">
                  Generated answers will appear here.
                </p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openSaved(item)}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.part}{item.caseNumber ?? ""}
                      </span>
                      <span className="truncate text-xs font-semibold">
                        {item.caseNumber
                          ? item.part === "B"
                            ? `Question ${item.caseNumber}`
                            : `Case ${item.caseNumber}`
                          : "Custom case"}
                      </span>
                    </div>
                    <p className="mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-400">{item.query}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <p className="rounded-2xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This app is public. Do not enter patient-identifying information.
          </p>
        </aside>

        <main className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <h1 className="text-base font-semibold">{partMeta[part].title}</h1>
              <p className="mt-1 text-xs text-slate-400">{partMeta[part].subtitle}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{caseLabel}</span>
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      list={`case-options-${part}`}
                      value={caseNumber}
                      onChange={(event) => handleCaseInput(event.target.value)}
                      placeholder={casePlaceholder}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-emerald-950"
                    />
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
                    <input
                      list={`item-options-${part}`}
                      inputMode="numeric"
                      value={itemNumber}
                      onChange={(event) => {
                        clearLiveState();
                        setItemNumber(event.target.value);
                        setResult(null);
                      }}
                      placeholder="Type or select item"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-emerald-950"
                    />
                    <datalist id={`item-options-${part}`}>
                      {Array.from({ length: 10 }, (_, index) => (
                        <option key={index + 1} value={String(index + 1)} />
                      ))}
                    </datalist>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold">PDF order</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Questions remain in source order from 1 to 171.</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Ordered source list</p>
                    <p className="text-[11px] text-slate-400">Search by number, Case ID or wording.</p>
                  </div>
                  <span className="text-[11px] text-slate-400">{filteredCatalog.length} items</span>
                </div>
                <div className="relative mb-2">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    placeholder={part === "B" ? "Search 11 or scenario wording" : "Search Case ID or scenario"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                  {filteredCatalog.map((entry) => (
                    <button
                      key={`${entry.part}-${entry.caseId}`}
                      type="button"
                      onClick={() => selectEntry(entry)}
                      className={cn(
                        "flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        caseNumber.toLowerCase() === entry.caseId.toLowerCase()
                          ? "bg-emerald-100/80 dark:bg-emerald-950/60"
                          : "hover:bg-white dark:hover:bg-slate-900",
                      )}
                    >
                      <span className="mt-0.5 min-w-11 rounded-md bg-white px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                        {entry.caseId}
                      </span>
                      <span className="max-h-10 overflow-hidden text-xs leading-5 text-slate-600 dark:text-slate-300">{entry.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Question or case text</h2>
              <p className="mt-1 text-xs text-slate-400">
                Review or edit the source reference. Exact licensed wording is retrieved from the approved private source.
              </p>
            </div>
            <textarea
              value={query}
              onChange={(event) => {
                clearLiveState();
                setQuery(event.target.value);
                setResult(null);
              }}
              rows={11}
              placeholder="Select a source question above or paste a new case here…"
              className="min-h-60 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/60 dark:focus:bg-slate-950 dark:focus:ring-emerald-950"
            />
            {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FileSearchIcon className="size-4" /> Saved answer is reused unless Refresh is pressed.
              </div>
              {loading ? (
                <button
                  type="button"
                  onClick={cancelAnalysis}
                  className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
                >
                  <SquareIcon className="size-3.5 fill-current" /> Stop analysis
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void analyse(false)}
                  className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <SparklesIcon className="size-4" /> Generate answer
                </button>
              )}
            </div>
          </section>
        </main>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <AnswerCard
            result={result}
            loading={loading}
            streamedAnswer={streamedAnswer}
            streamStatus={streamStatus}
            liveSources={liveSources}
            onCancel={cancelAnalysis}
            onRefresh={() => void analyse(true)}
          />
        </div>
      </div>
    </div>
  );
}
