import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCatalogPrompt,
  getCatalogForPart,
  type CaseView,
  type OralPart,
} from "@/lib/case-catalog";

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

const canonicalSourceVersion = process.env.CASE_SOURCE_VERSION?.trim() || "2026-07-23";
const answerPromptVersion = process.env.ANSWER_PROMPT_VERSION?.trim() || "oral-v1";

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

export function isCanonicalAnswerIdentity(identity: AnswerIdentity) {
  const caseNumber = cleanIdentifier(identity.caseNumber);
  if (!caseNumber) return false;

  const entry = getCatalogForPart(identity.part).find(
    (candidate) => cleanIdentifier(candidate.caseId) === caseNumber,
  );
  if (!entry) return false;

  if (identity.part === "B") {
    return !cleanIdentifier(identity.itemNumber) && identity.query.trim() === entry.prompt.trim();
  }

  if (identity.itemNumber !== "case-only" && identity.itemNumber !== "case-information") {
    return false;
  }

  return identity.query.trim() === buildCatalogPrompt(entry, identity.itemNumber as CaseView).trim();
}

function makeKey(identity: AnswerIdentity) {
  const raw = [
    identity.part,
    cleanIdentifier(identity.caseNumber),
    cleanIdentifier(identity.itemNumber) ?? "all",
    canonicalSourceVersion,
    answerPromptVersion,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function sanitizeStoredSources(sources: readonly StoredSource[] = []): StoredSource[] {
  return sources
    .filter((source) => typeof source?.filename === "string" && source.filename.trim())
    .map((source) => ({
      filename: source.filename.trim(),
      ...(typeof source.score === "number" && Number.isFinite(source.score)
        ? { score: source.score }
        : {}),
    }));
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

async function writeStore(store: StoreFile, signal?: AbortSignal) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    signal?.throwIfAborted();
    await rename(temporaryPath, storePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
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
    sources: sanitizeStoredSources(version.sources),
  };
}

export async function findSavedAnswer(identity: AnswerIdentity) {
  if (!isCanonicalAnswerIdentity(identity)) return null;
  const store = await readStore();
  const exact = store.records.find((record) => record.key === makeKey(identity));
  return exact ? latest(exact, true) : null;
}

export async function saveFreshAnswer(
  identity: AnswerIdentity,
  generated: { answer: string; mode?: string; sources?: StoredSource[] },
  options: { signal?: AbortSignal } = {},
): Promise<PublicAnswer | null> {
  if (!isCanonicalAnswerIdentity(identity)) return null;

  const operation = writeQueue.catch(() => undefined).then(async (): Promise<PublicAnswer> => {
    options.signal?.throwIfAborted();
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
      sources: sanitizeStoredSources(generated.sources),
      createdAt: now,
    });
    options.signal?.throwIfAborted();
    await writeStore(store, options.signal);
    return latest(record, false);
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

export async function listSavedAnswers(limit = 50) {
  const store = await readStore();
  return store.records
    .filter(
      (record) =>
        record.versions.length > 0 &&
        isCanonicalAnswerIdentity({
          part: record.part,
          caseNumber: record.caseNumber,
          itemNumber: record.itemNumber,
          query: record.query,
        }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.max(1, Math.min(limit, 200)))
    .map((record) => latest(record, true));
}
