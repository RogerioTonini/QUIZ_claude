import { useTranslations } from "next-intl";

export function PlaySkeleton() {
  const t = useTranslations("Play");

  return (
    <div role="status" className="animate-pulse space-y-6">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-5 w-1/2 rounded bg-surface" />
      <div className="h-2 rounded-full bg-surface" />
      <div className="space-y-2">
        <div className="h-6 rounded bg-surface" />
        <div className="h-6 w-3/4 rounded bg-surface" />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="h-14 rounded-lg bg-surface" />
        <div className="h-14 rounded-lg bg-surface" />
      </div>
    </div>
  );
}
