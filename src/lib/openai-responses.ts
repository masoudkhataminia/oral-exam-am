import {
  oralAnswerJsonSchema,
  oralAnswerSchema,
  renderStructuredOralAnswer,
  type StructuredOralAnswer,
} from "@/lib/oral-answer-framework";
import { buildOralSystemPrompt, type OralPart } from "@/lib/oral-system-prompt";

export type RetrievedSource = {
  fileId?: string;
  filename: string;
  score?: number;
};

export type OpenAIAnswer = {
  answer: string;
  mode: "openai" | "openai-file-search";
  sources: RetrievedSource[];
  model: string;
};

export type AnalysisProgress =
  | {
      type: "status";
      stage: "connecting" | "searching" | "drafting" | "validating";
      message: string;
    }
  | { type: "source"; source: RetrievedSource };

type ResponseContent = {
  type?: string;
  text?: string;
};

type ResponseOutputItem = {
  type?: string;
  content?: ResponseContent[];
  results?: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
    text?: string;
  }>;
};

type ResponsesPayload = {
  status?: string;
  output_text?: string;
  output?: ResponseOutputItem[];
  error?: { message?: string };
  incomplete_details?: { reason?: string };
};

type ResponsesStreamEvent = {
  type?: string;
  delta?: string;
  item?: { type?: string };
  response?: ResponsesPayload;
  error?: { message?: string };
  [key: string]: unknown;
};

function extractOutputText(payload: ResponsesPayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks: string[] = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function mergeSource(target: Map<string, RetrievedSource>, source: RetrievedSource) {
  const key = source.fileId || source.filename;
  const existing = target.get(key);
  if (!existing || (source.score ?? 0) > (existing.score ?? 0)) {
    target.set(key, source);
    return true;
  }
  return false;
}

function extractSources(payload: ResponsesPayload): RetrievedSource[] {
  const unique = new Map<string, RetrievedSource>();

  for (const item of payload.output ?? []) {
    if (item.type !== "file_search_call") continue;

    for (const result of item.results ?? []) {
      if (!result.filename) continue;
      mergeSource(unique, {
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
      });
    }
  }

  return [...unique.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function collectSourcesFromUnknown(
  value: unknown,
  target: Map<string, RetrievedSource>,
  onNewSource?: (source: RetrievedSource) => void,
) {
  if (Array.isArray(value)) {
    for (const item of value) collectSourcesFromUnknown(item, target, onNewSource);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const filename = record.filename;
  if (typeof filename === "string" && filename.trim()) {
    const source: RetrievedSource = {
      fileId: typeof record.file_id === "string" ? record.file_id : undefined,
      filename,
      score: typeof record.score === "number" ? record.score : undefined,
    };
    if (mergeSource(target, source)) onNewSource?.(source);
  }

  for (const child of Object.values(record)) {
    if (child !== value) collectSourcesFromUnknown(child, target, onNewSource);
  }
}

function referenceTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function referenceMatchesSource(reference: string, filename: string) {
  const referenceSet = referenceTokens(reference);
  const filenameSet = referenceTokens(filename);
  if (referenceSet.size === 0 || filenameSet.size === 0) return false;

  let overlap = 0;
  for (const token of referenceSet) if (filenameSet.has(token)) overlap += 1;
  return overlap / Math.min(referenceSet.size, filenameSet.size) >= 0.34;
}

function reconcileReferences(
  answer: StructuredOralAnswer,
  sources: RetrievedSource[],
): StructuredOralAnswer {
  if (sources.length === 0) {
    return {
      ...answer,
      references: [],
      evidenceGaps: [
        ...new Set([
          ...answer.evidenceGaps,
          "No indexed source was retrieved; all clinical or legal claims require confirmation before use.",
        ]),
      ],
    };
  }

  const confirmedReferences = answer.references.filter((reference) =>
    sources.some((source) => referenceMatchesSource(reference.source, source.filename)),
  );

  const rejectedCount = answer.references.length - confirmedReferences.length;
  return {
    ...answer,
    references: confirmedReferences,
    evidenceGaps:
      rejectedCount > 0
        ? [
            ...new Set([
              ...answer.evidenceGaps,
              `${rejectedCount} model-proposed reference${rejectedCount === 1 ? " was" : "s were"} omitted because the source was not returned by File Search.`,
            ]),
          ]
        : answer.evidenceGaps,
  };
}

function parseStructuredAnswer(raw: string): StructuredOralAnswer {
  try {
    return oralAnswerSchema.parse(JSON.parse(raw));
  } catch (error) {
    console.error("Invalid structured oral answer", error);
    throw new Error("OpenAI returned an answer that did not match the oral-exam schema");
  }
}

function assertCompleteResponse(payload: ResponsesPayload) {
  if (payload.status === "incomplete") {
    throw new Error(payload.incomplete_details?.reason || "OpenAI response was incomplete");
  }
}

function buildRequestBody(part: OralPart, query: string, stream: boolean) {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  const tools = vectorStoreId
    ? [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 10,
        },
      ]
    : undefined;

  return {
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    store: false,
    stream,
    instructions: buildOralSystemPrompt(part),
    input: `Exam part: ${part}\n\nCase or question:\n${query}`,
    reasoning: { effort: "low" },
    max_output_tokens: 3000,
    text: {
      format: {
        type: "json_schema",
        name: "oral_exam_answer",
        description: "A concise, evidence-grounded Australian intern pharmacist oral-exam answer.",
        strict: true,
        schema: oralAnswerJsonSchema,
      },
    },
    ...(tools
      ? {
          tools,
          tool_choice: "auto",
          include: ["file_search_call.results"],
        }
      : {}),
  };
}

function finalizeAnswer(
  rawAnswer: string,
  sources: RetrievedSource[],
  model: string,
  vectorStoreId?: string,
): OpenAIAnswer {
  if (!rawAnswer.trim()) throw new Error("OpenAI returned no answer text");
  const structuredAnswer = reconcileReferences(parseStructuredAnswer(rawAnswer), sources);
  return {
    answer: renderStructuredOralAnswer(structuredAnswer),
    mode: vectorStoreId ? "openai-file-search" : "openai",
    sources,
    model,
  };
}

export async function analyseWithOpenAI(part: OralPart, query: string): Promise<OpenAIAnswer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(part, query, false)),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as ResponsesPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}`);
  }
  assertCompleteResponse(payload);

  return finalizeAnswer(extractOutputText(payload), extractSources(payload), model, vectorStoreId);
}

export async function analyseWithOpenAIStream(
  part: OralPart,
  query: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: AnalysisProgress) => void;
  } = {},
): Promise<OpenAIAnswer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(90_000)])
    : AbortSignal.timeout(90_000);

  options.onProgress?.({
    type: "status",
    stage: "connecting",
    message: "Connecting to the evidence-grounded answer engine…",
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(part, query, true)),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorPayload = (await response.json().catch(() => ({}))) as ResponsesPayload;
    throw new Error(
      errorPayload.error?.message || `OpenAI streaming request failed with status ${response.status}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const streamedSources = new Map<string, RetrievedSource>();
  let buffer = "";
  let rawAnswer = "";
  let finalPayload: ResponsesPayload | undefined;
  let searchStarted = false;
  let draftingStarted = false;
  let streamCompleted = false;

  const handleEvent = (eventName: string, data: ResponsesStreamEvent) => {
    const type = data.type || eventName;

    collectSourcesFromUnknown(data, streamedSources, (source) => {
      options.onProgress?.({ type: "source", source });
    });

    if (
      type === "response.file_search_call.in_progress" ||
      type === "response.file_search_call.searching" ||
      (type === "response.output_item.added" && data.item?.type === "file_search_call")
    ) {
      if (!searchStarted) {
        searchStarted = true;
        options.onProgress?.({
          type: "status",
          stage: "searching",
          message: "Searching the approved Part A, B and C evidence sources…",
        });
      }
    }

    if (type === "response.file_search_call.completed") {
      options.onProgress?.({
        type: "status",
        stage: "searching",
        message:
          streamedSources.size > 0
            ? `${streamedSources.size} relevant source${streamedSources.size === 1 ? "" : "s"} retrieved.`
            : "Source search completed; checking the retrieved evidence…",
      });
    }

    if (type === "response.output_text.delta" && typeof data.delta === "string") {
      rawAnswer += data.delta;
      if (!draftingStarted) {
        draftingStarted = true;
        options.onProgress?.({
          type: "status",
          stage: "drafting",
          message: "Preparing a concise, exam-ready answer…",
        });
      }
    }

    if (type === "response.completed") {
      streamCompleted = true;
      if (data.response) {
        finalPayload = data.response;
        collectSourcesFromUnknown(finalPayload, streamedSources, (source) => {
          options.onProgress?.({ type: "source", source });
        });
      }
    }

    if (type === "response.incomplete") {
      throw new Error(
        data.response?.incomplete_details?.reason || "OpenAI response was incomplete",
      );
    }

    if (type === "response.failed" || type === "error") {
      throw new Error(data.error?.message || "OpenAI streaming response failed");
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || "";

    for (const frame of frames) {
      if (!frame.trim()) continue;
      let eventName = "";
      const dataLines: string[] = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      const serialized = dataLines.join("\n");
      if (!serialized || serialized === "[DONE]") continue;
      handleEvent(eventName, JSON.parse(serialized) as ResponsesStreamEvent);
    }
  }

  if (buffer.trim()) {
    const dataLine = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (dataLine && dataLine !== "[DONE]") {
      handleEvent("", JSON.parse(dataLine) as ResponsesStreamEvent);
    }
  }

  if (!streamCompleted) throw new Error("OpenAI response was incomplete");
  if (finalPayload) assertCompleteResponse(finalPayload);

  options.onProgress?.({
    type: "status",
    stage: "validating",
    message: "Validating safety points, structure and citations…",
  });

  const finalSources = new Map<string, RetrievedSource>(streamedSources);
  for (const source of finalPayload ? extractSources(finalPayload) : []) mergeSource(finalSources, source);
  const finalRawAnswer = finalPayload ? extractOutputText(finalPayload) || rawAnswer : rawAnswer;

  return finalizeAnswer(
    finalRawAnswer,
    [...finalSources.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    model,
    vectorStoreId,
  );
}
