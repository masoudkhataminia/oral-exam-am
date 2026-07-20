export function buildAnswerTemplate(part: "A" | "B" | "C", query: string): string {
  return [
    `## Part ${part} · Answer unavailable`,
    "",
    "The evidence-linked answer has not been generated because the OpenAI API or approved reference source is not connected.",
    "",
    "Do not use a guessed clinical or legal answer for this case.",
    "",
    "## References",
    "No indexed reference was available for this answer.",
    "",
    "## More details",
    `Selected question: ${query}`,
    "",
    "Connect the approved reference source and generate again. A completed answer will then be saved on the server automatically.",
  ].join("\n");
}
