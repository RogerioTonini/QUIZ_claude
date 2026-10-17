import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

// Static per locale (D34): rendered at build time for each locale of generateStaticParams.
export const alt = "Claude Code Quiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Home" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#1c1917",
        color: "#fafaf9",
      }}
    >
      <div style={{ fontSize: 40, color: "#e07a5f", fontWeight: 700 }}>
        Claude Code Quiz
      </div>
      <div style={{ marginTop: 24, fontSize: 72, fontWeight: 700 }}>
        {t("title")}
      </div>
      <div style={{ marginTop: 32, fontSize: 36, color: "#d6d3d1" }}>
        {t("subtitle")}
      </div>
    </div>,
    size,
  );
}
