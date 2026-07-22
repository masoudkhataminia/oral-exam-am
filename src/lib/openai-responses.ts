import {
  oralAnswerJsonSchema,
  oralAnswerSchema,
  renderStructuredOralAnswer,
  type StructuredOralAnswer,
} from "@/lib/oral-answer-framework";
import { buildOralSystemPrompt, type OralPart } from "@/lib/oral-system-prompt";

type RetrievedSource = {
  fileId?: string;
  filename: string;
  score?: number;
  text?: string;
};

type OpenAIAnswer = {
  answer: string;
  mode: "openai" | "openai-file-search";
  sources: RetrievedSource[];
  model: string;
};

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
  output_text?: string;
  output?: ResponseOutputItem[];
  error?: { message?: string };
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

function extractSources(payload: ResponsesPayload): RetrievedSource[] {
  const unique = new Map<string, RetrievedSource>();

  for (const item of payload.output ?? []) {
    if (item.type !== "file_search_call") continue;

    for (const result of item.results ?? []) {
      if (!result.filename) continue;
      const existing = unique.get(result.filename);
      if (!existing || (result.score ?? 0) > (existing.score ?? 0)) {
        unique.set(result.filename, {
          fileId: result.file_id,
          filename: result.filename,
          score: result.score,
          text: result.text,
        });
      }
    }
  }

  return [...unique.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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

export async function analyseWithOpenAI(part: OralPart, query: string): Promise<OpenAIAnswer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
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
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as ResponsesPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  const rawAnswer = extractOutputText(payload);
  if (!rawAnswer) throw new Error("OpenAI returned no answer text");

  const sources = extractSources(payload);
  const structuredAnswer = reconcileReferences(parseStructuredAnswer(rawAnswer), sources);

  return {
    answer: renderStructuredOralAnswer(structuredAnswer),
    mode: vectorStoreId ? "openai-file-search" : "openai",
    sources,
    model,
  };
}
