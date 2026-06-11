import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { LocaleProvider } from "@/lib/i18n/context";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Bolão da Copa",
  description: "World Cup Pool",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <LocaleProvider locale={locale}>
          <Header locale={locale} />
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
