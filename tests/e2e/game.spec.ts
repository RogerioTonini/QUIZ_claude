import { expect, test } from "./fixtures";
import { questionByStatement, startGame, statementHeading } from "./helpers";

test.describe("game", () => {
  test("plays a full game with mouse and keyboard and shows the result", async ({
    page,
  }) => {
    await startGame(page);

    for (let i = 1; i <= 10; i++) {
      await expect(page.getByText(`Pergunta ${i} de 10`)).toBeVisible();
      // After "Next", focus moves to the new statement so screen readers announce it.
      if (i > 1) await expect(statementHeading(page)).toBeFocused();
      const q = questionByStatement(
        (await statementHeading(page).textContent()) ?? "",
      );

      if (i % 2 === 0) {
        await page.keyboard.press(q.answer ? "v" : "f");
      } else {
        await page
          .getByRole("button", { name: q.answer ? "Verdadeiro" : "Falso" })
          .click();
      }

      await expect(
        page.getByRole("heading", { level: 2, name: "Correto!" }),
      ).toBeVisible();
      await expect(page.getByText(q.explanation["pt-BR"])).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Saiba mais na documentação/ }),
      ).toHaveAttribute("target", "_blank");

      const next = page.getByRole("button", {
        name: i === 10 ? "Ver resultado" : "Próxima",
      });
      await expect(next).toBeFocused();
      // Enter continues from the focused button.
      await page.keyboard.press("Enter");
    }

    await expect(page).toHaveURL(/\/pt-BR\/result\/[\w-]+$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Resultado" }),
    ).toBeVisible();
    await expect(page.getByText("Mestre do Claude Code")).toBeVisible();
    await expect(page.getByText("10/10").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revisão" }).locator("+ ol > li"),
    ).toHaveCount(10);
    await expect(
      page.getByRole("button", { name: "Compartilhar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Jogar de novo" }),
    ).toBeVisible();
  });

  test("never sends the answer or explanation before the player answers", async ({
    page,
  }) => {
    const bodies: string[] = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() === "image") return;
      try {
        bodies.push(await response.text());
      } catch {
        // Redirects and aborted requests have no body.
      }
    });

    await startGame(page);
    const q = questionByStatement(
      (await statementHeading(page).textContent()) ?? "",
    );
    const traffic = [...bodies, await page.content()].join("\n");

    expect(traffic).toContain(q.statement["pt-BR"]);
    for (const locale of ["pt-BR", "en", "de"] as const) {
      expect(traffic).not.toContain(q.explanation[locale]);
    }
    expect(traffic).not.toMatch(/"(answer|explanation|correctAnswer)"\s*:/);
  });

  test("reloading keeps the question and does not restart the timer", async ({
    page,
  }) => {
    await startGame(page);
    const statement = await statementHeading(page).textContent();
    const timer = page.getByRole("timer");
    await page.waitForTimeout(2_000);
    const before = parseInt((await timer.textContent()) ?? "", 10);
    expect(before).toBeLessThanOrEqual(28);

    await page.reload();
    await expect(statementHeading(page)).toHaveText(statement ?? "");
    await expect(page.getByText("Pergunta 1 de 10")).toBeVisible();
    const after = parseInt((await timer.textContent()) ?? "", 10);
    expect(after).toBeLessThanOrEqual(before);
  });

  test("sends a timeout when the time runs out", async ({ page }) => {
    await page.clock.install();
    await startGame(page);
    const q = questionByStatement(
      (await statementHeading(page).textContent()) ?? "",
    );

    await page.clock.runFor(31_000);

    await expect(
      page.getByRole("heading", { level: 2, name: "Tempo esgotado" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Resposta correta: ${q.answer ? "Verdadeiro" : "Falso"}`),
    ).toBeVisible();
    await expect(page.getByText("+0 pontos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Próxima" })).toBeVisible();
  });

  test("switching language mid-game reloads the same question", async ({
    page,
  }) => {
    await startGame(page);
    const q = questionByStatement(
      (await statementHeading(page).textContent()) ?? "",
    );

    const en = page.getByRole("link", { name: "EN", exact: true });
    await expect(en).toHaveAttribute("href", /\/en\/play\//);
    await en.click();
    await expect(page).toHaveURL(/\/en\/play\/[\w-]+$/);
    await expect(statementHeading(page)).toHaveText(q.statement.en);
    await expect(page.getByText("Question 1 of 10")).toBeVisible();

    await page.getByRole("link", { name: "DE", exact: true }).click();
    await expect(page).toHaveURL(/\/de\/play\/[\w-]+$/);
    await expect(statementHeading(page)).toHaveText(q.statement.de);

    // German keyboard shortcuts: W = Wahr, F = Falsch.
    await page.keyboard.press(q.answer ? "w" : "f");
    await expect(
      page.getByRole("heading", { level: 2, name: "Richtig!" }),
    ).toBeVisible();
    await expect(page.getByText(q.explanation.de)).toBeVisible();
  });
});
