import { buildOralSystemPrompt, type OralPart } from "@/lib/oral-system-prompt";

type RetrievedSource = {
  filename: string;
  score?: number;
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
    filename?: string;
    score?: number;
  }>;
};

type ResponsesPayload = {
  output_text?: string;
  output?: ResponseOutputItem[];
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
          filename: result.filename,
          score: result.score
        });
      }
    }
  }

  return [...unique.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export async function analyseWithOpenAI(part: OralPart, query: string): Promise<OpenAIAnswer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();

  const tools = vectorStoreId
    ? [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 8
        }
      ]
    : undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: buildOralSystemPrompt(part),
      input: `Exam part: ${part}\n\nCase or question:\n${query}`,
      reasoning: { effort: "low" },
      max_output_tokens: 2200,
      ...(tools ? { tools, tool_choice: "auto", include: ["file_search_call.results"] } : {})
    }),
    signal: AbortSignal.timeout(75_000)
  });

  const payload = (await response.json()) as ResponsesPayload & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  const answer = extractOutputText(payload);
  if (!answer) {
    throw new Error("OpenAI returned no answer text");
  }

  return {
    answer,
    mode: vectorStoreId ? "openai-file-search" : "openai",
    sources: extractSources(payload),
    model
  };
}
