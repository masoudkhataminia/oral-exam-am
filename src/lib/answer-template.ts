export function buildAnswerTemplate(part: "A" | "B" | "C", query: string): string {
  return [
    `Part ${part}`,
    `Query: ${query}`,
    "",
    "1. Main issue",
    "Pending evidence retrieval from approved sources.",
    "",
    "2. Information I would clarify",
    "- Patient identity, age and pregnancy/breastfeeding status where relevant",
    "- Indication, symptom duration, severity and red flags",
    "- Complete medication list, allergies, recent changes and adherence",
    "- Relevant medical history, pathology and monitoring",
    "",
    "3. Clinical / legal assessment",
    "Pending evidence-linked assessment.",
    "",
    "4. Immediate action",
    "Dispense, withhold, refer, contact prescriber/PIC, or escalate depending on findings.",
    "",
    "5. Oral-exam answer",
    "A concise spoken answer will be generated after retrieval.",
    "",
    "6. References",
    "- Scenario document: exact Part / Case ID / page",
    "- AMH: exact drug, interaction or therapeutic section",
    "- Applicable legislation or professional guideline"
  ].join("\n");
}
