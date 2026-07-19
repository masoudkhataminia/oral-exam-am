import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAnswerTemplate } from "@/lib/answer-template";
import { analyseWithOpenAI } from "@/lib/openai-responses";

const Input = z.object({
  part: z.enum(["A", "B", "C"]),
  query: z.string().trim().min(2).max(12000)
});

export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({
        answer: buildAnswerTemplate(input.part, input.query),
        mode: "local-template",
        sources: [],
        warning: "OPENAI_API_KEY is not configured."
      });
    }

    try {
      const result = await analyseWithOpenAI(input.part, input.query);
      return NextResponse.json(result);
    } catch (error) {
      console.error("OpenAI analysis failed", error);
      return NextResponse.json({
        answer: buildAnswerTemplate(input.part, input.query),
        mode: "safe-fallback",
        sources: [],
        warning: "The AI service was unavailable, so no clinical claims were generated."
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
