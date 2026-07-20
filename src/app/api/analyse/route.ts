import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAnswerTemplate } from "@/lib/answer-template";
import { analyseWithOpenAI } from "@/lib/openai-responses";
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

    try {
      const generated = await analyseWithOpenAI(input.part, input.query);
      const saved = await saveFreshAnswer(identity, generated);
      return NextResponse.json(saved);
    } catch (error) {
      console.error("OpenAI analysis failed", error);
      return NextResponse.json(
        unsavedPreview(
          identity,
          "safe-fallback",
          "The AI service was unavailable. This fallback was not saved as a completed answer.",
        ),
        { status: 503 },
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
