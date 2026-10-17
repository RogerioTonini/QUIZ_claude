"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createGame, GameApiError } from "@/lib/game-api";
import type { GameLevel } from "@/lib/zod-schemas";

/** Creates a game and navigates to it, exposing a localized error message on failure. */
export function useStartGame() {
  const t = useTranslations("StartGame");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(level: GameLevel) {
    setPending(true);
    setError(null);
    try {
      const { gameId } = await createGame(level, locale);
      router.push(`/play/${gameId}`);
    } catch (e) {
      setError(
        e instanceof GameApiError && e.code === "RATE_LIMITED"
          ? t("rateLimited")
          : t("error"),
      );
      setPending(false);
    }
  }

  return { start, pending, error };
}
