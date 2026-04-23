import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/providers/ReduxProvider";
import "react-toastify/dist/ReactToastify.css";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from "nextjs-toploader";
import { BreadcrumbProvider } from "@/providers/BreadcrumbProvider";
import { SessionProvider } from "next-auth/react";
import AuthInitializer from "@/providers/AuthInitializer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoM Plan Management System",
  description: "Ministry of Mining Plan Management System",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-primary`}
      >
        <NextTopLoader showSpinner={false} />

        <SessionProvider>
          <ReduxProvider>
            <NextIntlClientProvider>
              <BreadcrumbProvider>
                <AuthInitializer>{children}</AuthInitializer>
              </BreadcrumbProvider>
            </NextIntlClientProvider>
          </ReduxProvider>
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
