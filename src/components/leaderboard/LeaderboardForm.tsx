"use client";

import { type FormEvent, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import {
  GameApiError,
  type SubmittedEntry,
  submitLeaderboardEntry,
} from "@/lib/game-api";
import { addMyEntryId } from "@/lib/my-entries";
import { NICKNAME_MAX, nicknameProblem } from "@/lib/nickname";
import type { GameLevel } from "@/lib/zod-schemas";

/** Nickname form on the result page (PRD RF06). Validates locally with the server's rules. */
export function LeaderboardForm({
  gameId,
  level,
  open,
  existing,
}: {
  gameId: string;
  level: GameLevel;
  /** Still within 30 minutes of the end of the game. */
  open: boolean;
  existing: SubmittedEntry | null;
}) {
  const t = useTranslations();
  const inputId = useId();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [entry, setEntry] = useState(existing);

  const leaderboardHref = { pathname: "/leaderboard", query: { level } };

  if (entry) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-surface p-4">
        <p role="status" className="font-semibold">
          {t("LeaderboardForm.success", {
            rank: entry.rank,
            level: t(`Levels.${level}.name`),
          })}
        </p>
        <Link
          href={{ ...leaderboardHref, query: { level, period: "all" } }}
          className="text-accent underline underline-offset-2"
        >
          {t("Result.seeLeaderboard")}
        </Link>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-surface p-4">
        <p>{t("LeaderboardForm.closed")}</p>
        <Link
          href={leaderboardHref}
          className="text-accent underline underline-offset-2"
        >
          {t("Result.seeLeaderboard")}
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = nicknameProblem(nickname);
    if (problem) {
      setError(t(`LeaderboardForm.${problem}`));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await submitLeaderboardEntry(gameId, nickname.trim());
      addMyEntryId(result.entryId);
      track("leaderboard_submitted", { level });
      setEntry(result);
    } catch (e) {
      const code = e instanceof GameApiError ? e.code : "UNKNOWN";
      if (code === "SUBMISSION_CLOSED") setError(t("LeaderboardForm.closed"));
      else if (code === "RATE_LIMITED")
        setError(t("LeaderboardForm.rateLimited"));
      else if (code === "INVALID_INPUT")
        setError(t("LeaderboardForm.notAllowed"));
      else setError(t("LeaderboardForm.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-xl font-semibold">{t("LeaderboardForm.title")}</h2>
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={inputId} className="font-medium">
            {t("LeaderboardForm.label")}
          </label>
          <input
            id={inputId}
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX + 10}
            autoComplete="nickname"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${inputId}-hint ${inputId}-error`}
            className="min-h-12 rounded-lg border border-border bg-background px-3"
          />
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {t("LeaderboardForm.hint")}
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60 sm:mb-7"
        >
          {pending
            ? t("LeaderboardForm.submitting")
            : t("LeaderboardForm.submit")}
        </button>
      </form>
      <p
        id={`${inputId}-error`}
        role="alert"
        className="min-h-6 text-sm text-danger"
      >
        {error}
      </p>
    </section>
  );
}
