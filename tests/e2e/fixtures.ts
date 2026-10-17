import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

/**
 * Each test gets its own client IP, so the "20 games per hour per IP" rate limit never
 * leaks between tests or repeated runs.
 */
export const test = base.extend({
  // `provide` instead of Playwright's usual `use`, which the React hooks lint rule flags.
  context: async ({ context }, provide) => {
    const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await provide(context);
  },
});
