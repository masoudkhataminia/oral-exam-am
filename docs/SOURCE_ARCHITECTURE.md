# Professional source-code architecture

## Selected reusable source

### OpenAI Responses starter app

Repository: `openai/openai-responses-starter-app`  
Licence: MIT  
Use in this project:

- Responses API request architecture
- server-sent event streaming pattern
- `response.output_text.delta` handling
- `response.output_text.annotation.added` handling
- File Search lifecycle events
- citation annotation normalisation and de-duplication
- loading and tool-status presentation patterns

Excluded deliberately:

- general chat navigation
- Gmail, web-search, MCP and code-interpreter tools
- unrelated conversation stores
- file-download tools not required by the exam workspace

### OpenAI Knowledge Retrieval

Repository: `openai/openai-knowledge-retrieval`  
Licence: MIT  
Planned use in this project:

- reference ingestion workflow
- grounded-answer evaluation
- retrieval-quality tests
- citation completeness checks
- synthetic test-case generation

The complete application is not copied. Only small, relevant patterns should be adapted after review.

## Sources reviewed but not imported

Medical simulation repositories with non-commercial or restrictive licences may inform conceptual design, but their code must not be copied into this public/commercial-capable project.

## Oral-exam answer engine

This project uses three separate answer frameworks rather than one universal template:

- Part A: primary healthcare / OTC role-play
- Part B: law, ethics and professional practice
- Part C: clinical and prescription problem solving

The model returns strict structured JSON. The server then:

1. validates the output with Zod;
2. reconciles claimed references against actual File Search results;
3. removes unsupported citations;
4. records unresolved evidence gaps;
5. renders the validated data into the exam-ready response and collapsed educational details.

## Next extraction stage

The next OpenAI starter patterns to adapt are:

1. SSE route for progress and answer events;
2. client event reader;
3. File Search status indicators;
4. citation pills linked to retrieved files;
5. request cancellation.

These should be adapted to the structured oral-answer contract, not copied as a generic chatbot.
