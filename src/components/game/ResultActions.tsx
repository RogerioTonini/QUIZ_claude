"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GameLevel } from "@/lib/zod-schemas";
import { useStartGame } from "./useStartGame";

/** "Play again" (same level), "Choose another level" and "Share" (Web Share API or clipboard). */
export function ResultActions({
  level,
  score,
}: {
  level: GameLevel;
  score: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { start, pending, error } = useStartGame();
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const text = t("Result.shareText", {
      score,
      level: t(`Levels.${level}.name`),
      url: `${origin}/${locale}`,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus(t("Result.copied"));
    } catch {
      // The user dismissed the share sheet or the clipboard is unavailable.
    }
  }

  const button =
    "inline-flex min-h-12 items-center justify-center rounded-lg px-6 font-semibold";

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={pending}
          onClick={() => void start(level)}
          className={`${button} bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-60`}
        >
          {t("Result.playAgain")}
        </button>
        <Link
          href="/"
          className={`${button} border border-border hover:bg-surface`}
        >
          {t("Result.otherLevel")}
        </Link>
        <Link
          href={{ pathname: "/leaderboard", query: { level } }}
          className={`${button} border border-border hover:bg-surface`}
        >
          {t("Result.seeLeaderboard")}
        </Link>
        <button
          type="button"
          onClick={() => void share()}
          className={`${button} border border-border hover:bg-surface`}
        >
          {t("Result.share")}
        </button>
      </div>
      <p role="status" className="min-h-6 text-sm">
        {error ?? status}
      </p>
    </div>
  );
}
