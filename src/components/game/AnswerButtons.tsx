"use client";

import { useTranslations } from "next-intl";

export function AnswerButtons({
  disabled,
  onAnswer,
}: {
  disabled: boolean;
  onAnswer: (answer: boolean) => void;
}) {
  const t = useTranslations();
  const buttons = [
    { value: true, label: t("Answer.true"), key: t("Play.trueKey") },
    { value: false, label: t("Answer.false"), key: t("Play.falseKey") },
  ];

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={t("Play.answerGroup")}
        className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"
      >
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            disabled={disabled}
            aria-keyshortcuts={b.key}
            onClick={() => onAnswer(b.value)}
            className="flex min-h-14 items-center justify-center gap-3 rounded-lg border-2 border-border bg-surface px-4 text-lg font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {b.label}
            <kbd
              aria-hidden="true"
              className="rounded border border-border px-1.5 font-mono text-sm text-muted"
            >
              {b.key}
            </kbd>
          </button>
        ))}
      </div>
      <p className="hidden text-center text-xs text-muted sm:block">
        {t("Play.keyboardHint", {
          trueKey: t("Play.trueKey"),
          falseKey: t("Play.falseKey"),
        })}
      </p>
    </div>
  );
}
