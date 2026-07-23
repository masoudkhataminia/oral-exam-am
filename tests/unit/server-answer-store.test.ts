import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCatalogPrompt, partACases } from "@/lib/case-catalog";
import type { StoredSource } from "@/lib/server-answer-store";

let testDirectory: string;
let storePath: string;
let store: typeof import("@/lib/server-answer-store");

beforeAll(async () => {
  testDirectory = await mkdtemp(path.join(tmpdir(), "oral-exam-store-"));
  storePath = path.join(testDirectory, "answers.json");
  process.env.ANSWER_STORE_PATH = storePath;
  store = await import("@/lib/server-answer-store");
});

afterAll(async () => {
  await rm(testDirectory, { recursive: true, force: true });
});

function canonicalIdentity(index = 0) {
  const entry = partACases[index];
  return {
    part: "A" as const,
    caseNumber: entry.caseId,
    itemNumber: "case-information",
    query: buildCatalogPrompt(entry, "case-information"),
  };
}

describe("canonical answer persistence", () => {
  it("uses exact canonical identity and never fuzzy-matches edited cases", async () => {
    const canonical = canonicalIdentity();
    const saved = await store.saveFreshAnswer(canonical, {
      answer: "Canonical answer",
      mode: "test",
      sources: [
        {
          filename: "approved-source.pdf",
          score: 0.98,
          text: "LICENSED SECRET CHUNK",
          excerpt: "PRIVATE EXCERPT",
          raw: { chunk: "PRIVATE RAW" },
        } as unknown as StoredSource,
      ],
    });

    expect(saved?.version).toBe(1);
    expect(await store.findSavedAnswer(canonical)).toMatchObject({ answer: "Canonical answer" });

    const edited = { ...canonical, query: `${canonical.query}\nPregnancy status: not pregnant.` };
    expect(store.isCanonicalAnswerIdentity(edited)).toBe(false);
    expect(await store.findSavedAnswer(edited)).toBeNull();
    expect(await store.saveFreshAnswer(edited, { answer: "Must not persist" })).toBeNull();

    const rawStore = await readFile(storePath, "utf8");
    expect(rawStore).not.toContain("LICENSED SECRET CHUNK");
    expect(rawStore).not.toContain("PRIVATE EXCERPT");
    expect(rawStore).not.toContain("PRIVATE RAW");
    expect(saved?.sources).toEqual([{ filename: "approved-source.pdf", score: 0.98 }]);
  });

  it("filters legacy custom records from global history", async () => {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as { records: unknown[] };
    const now = new Date().toISOString();
    parsed.records.push({
      key: "legacy-custom",
      part: "C",
      query: "Private custom patient case",
      normalizedQuery: "private custom patient case",
      createdAt: now,
      updatedAt: now,
      versions: [{ version: 1, answer: "Private", sources: [], createdAt: now }],
    });
    await writeFile(storePath, JSON.stringify(parsed), "utf8");

    const history = await store.listSavedAnswers();
    expect(history).toHaveLength(1);
    expect(history[0].query).not.toContain("Private custom patient case");
  });

  it("does not write when the request was aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      store.saveFreshAnswer(canonicalIdentity(1), { answer: "Aborted answer" }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(await store.findSavedAnswer(canonicalIdentity(1))).toBeNull();
  });
});
