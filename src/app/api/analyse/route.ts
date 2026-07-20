import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAnswerTemplate } from "@/lib/answer-template";
import { analyseWithOpenAI } from "@/lib/openai-responses";
import { consumeGenerationAllowance } from "@/lib/rate-limit";
import {
  findSavedAnswer,
  listSavedAnswers,
  saveFreshAnswer,
  type AnswerIdentity,
} from "@/lib/server-answer-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  part: z.enum(["A", "B", "C"]),
  caseNumber: z.string().trim().max(80).optional(),
  itemNumber: z.string().trim().max(80).optional(),
  query: z.string().trim().min(2).max(12000),
  forceRefresh: z.boolean().optional().default(false),
});

function unsavedPreview(identity: AnswerIdentity, mode: string, warning: string) {
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

export async function GET() {
  try {
    const items = await listSavedAnswers(80);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Could not read saved oral-exam answers", error);
    return NextResponse.json({ error: "Saved answers could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());
    const identity: AnswerIdentity = {
      part: input.part,
      caseNumber: input.caseNumber,
      itemNumber: input.itemNumber,
      query: input.query,
    };

    if (!input.forceRefresh) {
      const saved = await findSavedAnswer(identity);
      if (saved) return NextResponse.json(saved);
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        unsavedPreview(
          identity,
          "local-template",
          "OPENAI_API_KEY is not configured. This preview was not saved as a completed answer.",
        ),
      );
    }

    const allowance = consumeGenerationAllowance(request);
    const rateHeaders = {
      "X-RateLimit-Limit": String(allowance.limit),
      "X-RateLimit-Remaining": String(allowance.remaining),
      "X-RateLimit-Reset": String(Math.ceil(allowance.resetAt / 1_000)),
    };

    if (!allowance.allowed) {
      const retryAfter = Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1_000));
      return NextResponse.json(
        { error: "Fresh-answer limit reached. Saved answers remain available; try Refresh again later." },
        {
          status: 429,
          headers: { ...rateHeaders, "Retry-After": String(retryAfter) },
        },
      );
    }

    try {
      const generated = await analyseWithOpenAI(input.part, input.query);
      const saved = await saveFreshAnswer(identity, generated);
      return NextResponse.json(saved, { headers: rateHeaders });
    } catch (error) {
      console.error("OpenAI analysis failed", error);
      return NextResponse.json(
        unsavedPreview(
          identity,
          "safe-fallback",
          "The AI service was unavailable. This fallback was not saved as a completed answer.",
        ),
        { status: 503, headers: rateHeaders },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request.", details: error.issues }, { status: 400 });
    }

    console.error("Oral-exam analysis request failed", error);
    return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
  }
}
