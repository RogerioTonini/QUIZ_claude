"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useTranslations } from "next-intl";

const TOTAL_MS = 30_000;
const WARNING_MS = 5_000;
const TICK_MS = 200;

/**
 * Countdown to a deadline derived from the server's remainingMs. Calls onExpire once at zero;
 * the server still decides whether the answer timed out.
 */
export function Timer({
  deadline,
  onExpire,
}: {
  deadline: number;
  onExpire: () => void;
}) {
  const t = useTranslations("Play");
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, deadline - Date.now()),
  );
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    let fired = false;
    const id = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        clearInterval(id);
        expire();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [deadline]);

  const seconds = Math.ceil(remaining / 1000);
  const warning = remaining <= WARNING_MS;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{t("timeLeft")}</span>
        <span
          role="timer"
          className={`font-mono font-semibold tabular-nums ${warning ? "text-danger" : ""}`}
        >
          {t("seconds", { seconds })}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${warning ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${(remaining / TOTAL_MS) * 100}%` }}
        />
      </div>
      {/* Announced once, when the last five seconds start. */}
      <p aria-live="polite" className="sr-only">
        {warning && remaining > 0 ? t("fiveSecondsLeft") : ""}
      </p>
    </div>
  );
}
