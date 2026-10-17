import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { locale as localeParam } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeParam();
  const t = await getTranslations("Metadata");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${t("siteName")}` },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      title: t("title"),
      description: t("description"),
      locale: locale.replace("-", "_"),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await localeParam();
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
              <Link href="/" className="font-semibold">
                {t("Header.title")}
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/how-it-works"
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
                >
                  {t("Header.howItWorks")}
                </Link>
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-border">
            <div className="mx-auto max-w-3xl space-y-1 px-4 py-4 text-sm text-muted">
              <p>{t("Footer.disclaimer")}</p>
              <p>{t("Footer.privacy")}</p>
            </div>
          </footer>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
