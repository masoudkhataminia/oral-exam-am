"use client";

import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import {
  BookOpenIcon,
  ChevronRightIcon,
  Clock3Icon,
  FileTextIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  PanelLeftCloseIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OralExamThread } from "@/components/assistant-ui/thread";
import { cn } from "@/lib/utils";

type Part = "A" | "B" | "C";

const parts: Array<{
  id: Part;
  label: string;
  title: string;
  subtitle: string;
}> = [
  { id: "A", label: "Part A", title: "OTC & Self-care", subtitle: "Symptoms, referral and counselling" },
  { id: "B", label: "Part B", title: "Legal & Ethical", subtitle: "Law, standards and escalation" },
  { id: "C", label: "Part C", title: "Clinical & Prescription", subtitle: "Screening, intervention and monitoring" },
];

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const item = part as { type?: string; text?: string };
      return item.type === "text" && typeof item.text === "string" ? item.text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function RuntimeSession({ part }: { part: Part }) {
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const lastMessage = messages.at(-1);
        const query = extractText(lastMessage?.content);

        if (!query) {
          yield {
            content: [{ type: "text", text: "Please enter a case or question to analyse." }],
          };
          return;
        }

        const response = await fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ part, query }),
          signal: abortSignal,
        });

        const payload = (await response.json()) as {
          answer?: string;
          error?: string;
          warning?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "The case could not be analysed.");
        }

        const answer = payload.answer || payload.warning || "No answer was returned.";
        yield { content: [{ type: "text", text: answer }] };
      },
    }),
    [part],
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <OralExamThread part={part} />
    </AssistantRuntimeProvider>
  );
}

export function OralExamShell() {
  const [part, setPart] = useState<Part>("C");
  const [sessionKey, setSessionKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const startNewCase = () => {
    setSessionKey((current) => current + 1);
    setSidebarOpen(false);
  };

  const selectPart = (nextPart: Part) => {
    setPart(nextPart);
    setSessionKey((current) => current + 1);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-950",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <SparklesIcon className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">ORAL EXAM</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">AMH Assistant</div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 md:hidden dark:hover:bg-slate-900"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={startNewCase}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <MessageSquarePlusIcon className="size-4" />
            New case
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Exam sections</p>
          <div className="space-y-1">
            {parts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPart(item.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                  part === item.id
                    ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                    part === item.id
                      ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950",
                  )}
                >
                  {item.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] opacity-65">{item.subtitle}</span>
                </span>
                <ChevronRightIcon className="size-4 opacity-30 transition group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          <p className="mb-2 mt-7 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <div className="space-y-1 text-sm">
            <SidebarLink icon={Clock3Icon} label="Case history" muted="Not connected" />
            <SidebarLink icon={BookOpenIcon} label="References" muted="Add later" />
            <SidebarLink icon={FileTextIcon} label="Source documents" muted="Vector store" />
          </div>
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldCheckIcon className="size-4 shrink-0" />
            Evidence mode is enabled; unsupported claims are flagged.
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <SettingsIcon className="size-4" />
            Settings
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col p-0 md:p-3 md:pl-0">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm dark:bg-slate-950 md:dark:border-slate-800">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 md:px-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-900"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <MenuIcon className="size-5" />
              </button>
              <div>
                <div className="text-sm font-semibold">{parts.find((item) => item.id === part)?.title}</div>
                <div className="text-xs text-slate-400">Australian intern pharmacist oral practice</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 sm:flex dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <SearchIcon className="size-3.5" />
                Search cases
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                aria-label="Collapse panel"
              >
                <PanelLeftCloseIcon className="size-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <RuntimeSession key={`${part}-${sessionKey}`} part={part} />
          </div>
        </section>
      </main>
    </div>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  muted,
}: {
  icon: typeof Clock3Icon;
  label: string;
  muted: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] text-slate-400">{muted}</span>
    </button>
  );
}
