import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analyse", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items: [] } });
      return;
    }
    await route.continue();
  });

  await page.route("**/api/analyse/stream", async (route) => {
    const input = route.request().postDataJSON() as {
      part: "A" | "B" | "C";
      caseNumber?: string;
      itemNumber?: string;
      query: string;
      requestId: string;
    };
    const canonical = Boolean(input.caseNumber && input.query.startsWith(`Part ${input.part},`));
    const now = new Date().toISOString();
    const result = {
      key: canonical ? "canonical-test" : "unsaved-custom",
      part: input.part,
      caseNumber: input.caseNumber,
      itemNumber: input.itemNumber,
      query: input.query,
      answer: "## Direct response\n- Mocked exam-ready answer.\n\n## More details\nMocked educational detail.",
      cached: false,
      createdAt: now,
      updatedAt: now,
      version: canonical ? 1 : 0,
      mode: "mocked",
      sources: [{ filename: "approved-source.pdf", score: 0.99 }],
    };
    const events = [
      { type: "status", stage: "drafting", message: "Preparing answer…", requestId: input.requestId },
      { type: "complete", result, requestId: input.requestId },
    ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    });
  });
});

test("generates a mocked canonical answer and displays safe source metadata", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /F4283/ }).click();
  await page.getByRole("button", { name: "Generate answer" }).click();

  await expect(page.getByText("Mocked exam-ready answer.")).toBeVisible();
  await expect(page.getByText("Fresh answer")).toBeVisible();
  await expect(page.getByText("approved-source.pdf")).toBeVisible();
});

test("marks pasted custom cases as unsaved", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Select a source question above or paste a new case here…").fill(
    "Custom case without patient-identifying information",
  );
  await page.getByRole("button", { name: "Generate answer" }).click();

  await expect(page.getByText("Mocked exam-ready answer.")).toBeVisible();
  await expect(page.getByText("Preview · not saved")).toBeVisible();
});
