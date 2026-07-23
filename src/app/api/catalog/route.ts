import { NextResponse } from "next/server";
import { getCatalogForPart, type OralPart } from "@/lib/case-catalog";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const part = new URL(request.url).searchParams.get("part");
  if (part !== "A" && part !== "B" && part !== "C") {
    return NextResponse.json({ error: "Part must be A, B or C." }, { status: 400 });
  }

  return NextResponse.json({
    items: getCatalogForPart(part as OralPart),
  });
}
