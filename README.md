# ORAL EXAM AMH

Independent assistant for Australian intern pharmacist oral-exam preparation.

## Access boundary

Only this repository may be modified. Existing repositories, apps, APIs and websites are reference-only.

## Current MVP

- Part A / B / C selector
- Search by Case ID, page, medicine or pasted scenario
- Structured eight-section oral-exam output
- OpenAI Responses API integration
- Optional OpenAI File Search over indexed Part A/B/C documents
- Safe local fallback when the API is unavailable
- No invented AMH, legal or guideline citation when evidence is unavailable

## Required environment variables

Copy `.env.example` to `.env.local` and add:

```bash
OPENAI_API_KEY=your_project_api_key
OPENAI_MODEL=gpt-5-mini
OPENAI_VECTOR_STORE_ID=vs_your_vector_store_id
AMH_REFERENCE_MODE=file-search
```

`OPENAI_VECTOR_STORE_ID` is optional. Without it, the app can reason with the supplied case but cannot claim that it searched the indexed reference documents.

## Recommended source setup

Create one OpenAI vector store and upload the approved Part A, Part B and Part C source documents once. The app then uses hosted File Search instead of building a custom embedding database.

Do not upload or reproduce licensed AMH content unless your licence and the applicable terms permit that use. AMH Online should be treated as an authorised reference source, not scraped or copied automatically without permission.

## Run

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```
