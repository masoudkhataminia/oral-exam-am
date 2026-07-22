import type { OralPart } from "@/lib/case-catalog";

export type StreamAnalyseResult = {
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

export type AnalysisStreamEvent =
  | { type: "status"; stage: string; message: string; requestId?: string }
  | { type: "source"; source: { filename: string; score?: number }; requestId?: string }
  | { type: "answer_delta"; delta: string; requestId?: string }
  | { type: "complete"; result: StreamAnalyseResult; requestId?: string }
  | { type: "error"; message: string; requestId?: string }
  | { type: "cancelled"; requestId?: string };

export type AnalysisStreamInput = {
  part: OralPart;
  caseNumber?: string;
  itemNumber?: string;
  query: string;
  forceRefresh: boolean;
  requestId: string;
};

export function isCurrentAnalysisEvent(
  active: { controller: AbortController; requestId: string } | null,
  controller: AbortController,
  requestId: string,
  eventRequestId?: string,
) {
  return (
    !controller.signal.aborted &&
    active?.controller === controller &&
    active.requestId === requestId &&
    (!eventRequestId || eventRequestId === requestId)
  );
}

export async function streamAnalysis(
  input: AnalysisStreamInput,
  options: {
    signal: AbortSignal;
    onEvent: (event: AnalysisStreamEvent) => void | Promise<void>;
  },
) {
  const response = await fetch("/api/analyse/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `Analysis stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processFrame = async (frame: string) => {
    const serialized = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!serialized || serialized === "[DONE]") return;
    await options.onEvent(JSON.parse(serialized) as AnalysisStreamEvent);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || "";
    for (const frame of frames) await processFrame(frame);
  }

  if (buffer.trim()) await processFrame(buffer);
}
