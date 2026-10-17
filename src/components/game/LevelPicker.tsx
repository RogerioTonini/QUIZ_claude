"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GameLevel } from "@/lib/zod-schemas";
import { useStartGame } from "./useStartGame";

export type LevelOption = { level: GameLevel; basePoints: number | null };

/** The four level cards as a radio group, plus the single "Play" button. */
export function LevelPicker({ options }: { options: LevelOption[] }) {
  const t = useTranslations();
  const [level, setLevel] = useState<GameLevel>(options[0].level);
  const { start, pending, error } = useStartGame();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void start(level);
      }}
    >
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">
          {t("Home.chooseLevel")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.level}
              className="flex cursor-pointer gap-3 rounded-lg border border-border bg-surface p-4 has-checked:border-accent has-checked:ring-2 has-checked:ring-accent has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="level"
                value={option.level}
                checked={level === option.level}
                onChange={() => setLevel(option.level)}
                className="mt-1 size-4 accent-accent"
              />
              <span className="space-y-1">
                <span className="block font-semibold">
                  {t(`Levels.${option.level}.name`)}
                </span>
                <span className="block text-sm text-muted">
                  {t(`Levels.${option.level}.description`)}
                </span>
                <span className="block text-sm font-medium text-accent">
                  {option.basePoints === null
                    ? t("Home.mixedPoints")
                    : t("Home.basePoints", { points: option.basePoints })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 text-center">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-lg bg-accent px-8 text-lg font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {pending ? t("Home.starting") : t("Home.play")}
        </button>
        <p role="alert" className="min-h-6 text-sm text-danger">
          {error}
        </p>
      </div>
    </form>
  );
}
