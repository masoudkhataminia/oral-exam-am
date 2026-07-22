import { z } from "zod";
import { buildAnswerTemplate } from "@/lib/answer-template";
import {
  analyseWithOpenAIStream,
  type AnalysisProgress,
} from "@/lib/openai-responses";
import { consumeGenerationAllowance } from "@/lib/rate-limit";
import {
  findSavedAnswer,
  sanitizeStoredSources,
  saveFreshAnswer,
  type AnswerIdentity,
  type PublicAnswer,
} from "@/lib/server-answer-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  part: z.enum(["A", "B", "C"]),
  caseNumber: z.string().trim().max(80).optional(),
  itemNumber: z.string().trim().max(80).optional(),
  query: z.string().trim().min(2).max(12000),
  forceRefresh: z.boolean().optional().default(false),
  requestId: z.string().trim().min(1).max(100).optional(),
});

type StreamEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "source"; source: { filename: string; score?: number } }
  | { type: "answer_delta"; delta: string }
  | { type: "complete"; result: PublicAnswer }
  | { type: "error"; message: string }
  | { type: "cancelled" };

function unsavedPreview(identity: AnswerIdentity, mode: string, warning: string): PublicAnswer & {
  warning: string;
} {
  const now = new Date().toISOString();
  return {
    key: "unsaved-preview",
    ...identity,
    answer: buildAnswerTemplate(identity.part, identity.query),
    cached: false,
    createdAt: now,
    updatedAt: now,
    version: 0,
    mode,
    sources: [],
    warning,
  };
}

function unsavedGenerated(
  identity: AnswerIdentity,
  generated: Awaited<ReturnType<typeof analyseWithOpenAIStream>>,
): PublicAnswer {
  const now = new Date().toISOString();
  return {
    key: "unsaved-custom",
    ...identity,
    answer: generated.answer,
    cached: false,
    createdAt: now,
    updatedAt: now,
    version: 0,
    mode: generated.mode,
    sources: sanitizeStoredSources(generated.sources),
  };
}

function splitAnswerForStreaming(answer: string) {
  const chunks: string[] = [];
  for (const block of answer.split(/(\n\n+)/)) {
    if (!block) continue;
    if (block.length <= 420) {
      chunks.push(block);
      continue;
    }
    for (let index = 0; index < block.length; index += 420) {
      chunks.push(block.slice(index, index + 420));
    }
  }
  return chunks;
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof Input>;
  try {
    parsed = Input.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error: "Invalid request.",
        details: error instanceof z.ZodError ? error.issues : undefined,
      },
      { status: 400 },
    );
  }

  const identity: AnswerIdentity = {
    part: parsed.part,
    caseNumber: parsed.caseNumber,
    itemNumber: parsed.itemNumber,
    query: parsed.query,
  };

  const encoder = new TextEncoder();
  let closed = false;
  const requestId = parsed.requestId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (closed || request.signal.aborted) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...event, requestId })}\n\n`));
      };

      const finish = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        send({ type: "status", stage: "cache", message: "Checking saved answers…" });

        if (!parsed.forceRefresh) {
          const saved = await findSavedAnswer(identity);
          if (saved) {
            send({ type: "status", stage: "cache", message: "Saved answer found — no API request used." });
            send({ type: "complete", result: saved });
            finish();
            return;
          }
        }

        if (!process.env.OPENAI_API_KEY?.trim()) {
          const preview = unsavedPreview(
            identity,
            "local-template",
            "OPENAI_API_KEY is not configured. This preview was not saved as a completed answer.",
          );
          send({ type: "complete", result: preview });
          finish();
          return;
        }

        const allowance = await consumeGenerationAllowance(request);
        if (!allowance.allowed) {
          send({
            type: "error",
            message: allowance.unavailable
              ? "Fresh-answer generation is temporarily unavailable because the production rate limiter is not ready."
              : "Fresh-answer limit reached. Saved answers remain available; try Refresh again later.",
          });
          finish();
          return;
        }

        const generated = await analyseWithOpenAIStream(parsed.part, parsed.query, {
          signal: request.signal,
          onProgress(progress: AnalysisProgress) {
            if (progress.type === "source") {
              send({
                type: "source",
                source: {
                  filename: progress.source.filename,
                  score: progress.source.score,
                },
              });
              return;
            }
            send({
              type: "status",
              stage: progress.stage,
              message: progress.message,
            });
          },
        });

        request.signal.throwIfAborted();
        send({ type: "status", stage: "saving", message: "Saving the validated answer and source record…" });
        const saved =
          (await saveFreshAnswer(identity, generated, { signal: request.signal })) ??
          unsavedGenerated(identity, generated);

        send({ type: "status", stage: "presenting", message: "Answer ready." });
        for (const delta of splitAnswerForStreaming(saved.answer)) {
          send({ type: "answer_delta", delta });
        }
        send({ type: "complete", result: saved });
        finish();
      } catch (error) {
        if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          send({ type: "cancelled" });
          finish();
          return;
        }

        console.error("Streaming oral-exam analysis failed", error);
        send({
          type: "error",
          message: error instanceof Error ? error.message : "The answer could not be generated.",
        });
        finish();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
