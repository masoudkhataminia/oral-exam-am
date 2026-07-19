import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAnswerTemplate } from "@/lib/answer-template";

const Input = z.object({
  part: z.enum(["A","B","C"]),
  query: z.string().trim().min(2).max(12000)
});

export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());
    return NextResponse.json({
      answer: buildAnswerTemplate(input.part, input.query),
      mode: "local-template"
    });
  } catch {
    return NextResponse.json({error: "Invalid request."}, {status: 400});
  }
}
