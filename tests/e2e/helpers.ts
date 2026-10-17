import type { Page } from "@playwright/test";
import bank from "../../src/content/questions.json";
import { expect } from "./fixtures";

export type Locale = "pt-BR" | "en" | "de";
const questions = bank.questions as {
  id: string;
  answer: boolean;
  statement: Record<Locale, string>;
  explanation: Record<Locale, string>;
}[];

export function questionByStatement(
  statement: string,
  locale: Locale = "pt-BR",
) {
  const q = questions.find((item) => item.statement[locale] === statement);
  if (!q) throw new Error(`Unknown statement: ${statement}`);
  return q;
}

export const statementHeading = (page: Page) =>
  page.getByRole("heading", { level: 1 });

export async function startGame(page: Page, levelName = "Iniciante") {
  await page.goto("/pt-BR");
  await page.getByRole("radio", { name: new RegExp(levelName) }).check();
  await page.getByRole("button", { name: "Jogar" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/play\/[\w-]+$/);
  await expect(page.getByText("Pergunta 1 de 10")).toBeVisible();
}

/** Answers all 10 questions correctly with the mouse and lands on the result page. */
export async function playToResult(page: Page) {
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Pergunta ${i} de 10`)).toBeVisible();
    const q = questionByStatement(
      (await statementHeading(page).textContent()) ?? "",
    );
    await page
      .getByRole("button", { name: q.answer ? "Verdadeiro" : "Falso" })
      .click();
    await page
      .getByRole("button", { name: i === 10 ? "Ver resultado" : "Próxima" })
      .click();
  }
  await expect(page).toHaveURL(/\/pt-BR\/result\/[\w-]+$/);
}
