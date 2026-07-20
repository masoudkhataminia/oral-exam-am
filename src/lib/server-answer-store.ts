import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OralPart } from "@/lib/case-catalog";

export type StoredSource = { filename: string; score?: number };

type StoredVersion = {
  version: number;
  answer: string;
  mode?: string;
  sources: StoredSource[];
  createdAt: string;
};

type StoredRecord = {
  key: string;
  part: OralPart;
  caseNumber?: string;
  itemNumber?: string;
  query: string;
  normalizedQuery: string;
  createdAt: string;
  updatedAt: string;
  versions: StoredVersion[];
};

type StoreFile = { records: StoredRecord[] };

export type PublicAnswer = {
  key: string;
  part: OralPart;
  caseNumber?: string;
  itemNumber?: string;
  query: string;
  answer: string;
  cached: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  mode?: string;
  sources: StoredSource[];
};

export type AnswerIdentity = {
  part: OralPart;
  caseNumber?: string;
  itemNumber?: string;
  query: string;
};

const storePath =
  process.env.ANSWER_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".data", "oral-exam-answers.json");

let writeQueue: Promise<void> = Promise.resolve();

function cleanIdentifier(value?: string) {
  const cleaned = value?.trim().toLowerCase();
  return cleaned || undefined;
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeKey(identity: AnswerIdentity) {
  const raw = [
    identity.part,
    cleanIdentifier(identity.caseNumber) ?? "custom",
    cleanIdentifier(identity.itemNumber) ?? "all",
    normalizeQuery(identity.query),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function tokenSimilarity(left: string, right: string) {
  if (left === right) return 1;
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / new Set([...a, ...b]).size;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || error instanceof SyntaxError) return { records: [] };
    throw error;
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  await rename(temporaryPath, storePath);
}

function latest(record: StoredRecord, cached: boolean): PublicAnswer {
  const version = record.versions.at(-1);
  if (!version) throw new Error("Saved answer has no version");
  return {
    key: record.key,
    part: record.part,
    caseNumber: record.caseNumber,
    itemNumber: record.itemNumber,
    query: record.query,
    answer: version.answer,
    cached,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: version.version,
    mode: version.mode,
    sources: version.sources,
  };
}

function sameStructuredLocation(record: StoredRecord, identity: AnswerIdentity) {
  return (
    record.part === identity.part &&
    cleanIdentifier(record.caseNumber) === cleanIdentifier(identity.caseNumber) &&
    cleanIdentifier(record.itemNumber) === cleanIdentifier(identity.itemNumber)
  );
}

export async function findSavedAnswer(identity: AnswerIdentity) {
  const store = await readStore();
  const exact = store.records.find((record) => record.key === makeKey(identity));
  if (exact) return latest(exact, true);

  const normalized = normalizeQuery(identity.query);
  const nearMatch = store.records
    .filter((record) => sameStructuredLocation(record, identity))
    .map((record) => ({ record, score: tokenSimilarity(record.normalizedQuery, normalized) }))
    .filter((candidate) => candidate.score >= 0.94)
    .sort((a, b) => b.score - a.score)[0]?.record;
  return nearMatch ? latest(nearMatch, true) : null;
}

export async function saveFreshAnswer(
  identity: AnswerIdentity,
  generated: { answer: string; mode?: string; sources?: StoredSource[] },
) {
  let output: PublicAnswer | null = null;
  const operation = writeQueue.catch(() => undefined).then(async () => {
    const store = await readStore();
    const key = makeKey(identity);
    const now = new Date().toISOString();
    let record = store.records.find((item) => item.key === key);

    if (!record) {
      record = {
        key,
        part: identity.part,
        caseNumber: identity.caseNumber?.trim() || undefined,
        itemNumber: identity.itemNumber?.trim() || undefined,
        query: identity.query.trim(),
        normalizedQuery: normalizeQuery(identity.query),
        createdAt: now,
        updatedAt: now,
        versions: [],
      };
      store.records.push(record);
    }

    record.query = identity.query.trim();
    record.normalizedQuery = normalizeQuery(identity.query);
    record.updatedAt = now;
    record.versions.push({
      version: (record.versions.at(-1)?.version ?? 0) + 1,
      answer: generated.answer,
      mode: generated.mode,
      sources: generated.sources ?? [],
      createdAt: now,
    });
    await writeStore(store);
    output = latest(record, false);
  });

  writeQueue = operation.catch(() => undefined);
  await operation;
  if (!output) throw new Error("The generated answer could not be saved");
  return output;
}

export async function listSavedAnswers(limit = 50) {
  const store = await readStore();
  return store.records
    .filter((record) => record.versions.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.max(1, Math.min(limit, 200)))
    .map((record) => latest(record, true));
}
