# ORAL EXAM AMH

Public study workspace for Australian intern pharmacist oral-exam preparation.

## Access boundary

Only this repository may be modified. Existing repositories, apps, APIs and websites are reference-only.

## Current workspace

- No login; the site is public.
- Part A, Part B and Part C selector.
- Searchable and selectable Case ID / question fields.
- Part A preserves all 165 Case IDs in the source-PDF order.
- Part C preserves all 158 Case IDs in the source-PDF order.
- Part B questions remain sequential from 1 to 171.
- Part A and Part C use the real source structure: `Case Only` or `Case + Information`; they do not use invented numbered case items.
- The detailed source page is stored for every Part A and Part C Case ID; Part A also stores its exact Case Only page.
- The selected source filename, page and view are copied into an editable question box.
- Exact full scenario wording remains in the approved private indexed source rather than the public repository.
- Answers are concise, question-specific and intended for oral delivery.
- `More details` remains collapsed for optional educational reasoning.
- File Search and answer-generation stages stream live to the interface.
- Successful answers are stored automatically on the server.
- The same question and case view reuse their saved answer without another OpenAI request.
- `Refresh` forces a new search and saves a new version.
- Saved-answer history is available from other devices using the same deployment.
- Fresh public generation is rate-limited; cached answers do not consume that allowance.
- Unsupported clinical, legal or citation claims must be identified rather than invented.

## Environment

Copy `.env.example` to `.env.local` and configure:

```bash
OPENAI_API_KEY=your_project_api_key
OPENAI_MODEL=gpt-5-mini
OPENAI_VECTOR_STORE_ID=vs_your_vector_store_id
AMH_REFERENCE_MODE=file-search
ANSWER_STORE_PATH=/data/oral-exam-answers.json
RATE_LIMIT_PER_HOUR=20
```

Keep `OPENAI_API_KEY` server-side. Never place it in a variable prefixed with `NEXT_PUBLIC_`.

`OPENAI_VECTOR_STORE_ID` should point to the approved Part A, Part B and Part C reference documents. Without an indexed source, the app must not claim that it searched those documents.

## Persistent server storage

The default development store is `.data/oral-exam-answers.json`. In production, mount a persistent server volume and set:

```bash
ANSWER_STORE_PATH=/data/oral-exam-answers.json
```

Without a persistent volume, a hosting rebuild or instance replacement may remove saved answers. The mounted `/data` directory must be writable by the application process and must not be publicly served.

## Public deployment

Deploy the Next.js server first, then point the Cloudflare subdomain to that deployment. Configure HTTPS, proxying and an additional Cloudflare rate-limit rule before sharing the public URL.

Do not store or submit patient-identifying information. Do not scrape or reproduce licensed AMH content unless the licence and applicable terms permit it. Exact licensed wording should remain in the approved private reference source.

## Run locally

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```
