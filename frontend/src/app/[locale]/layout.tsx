import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/providers/ReduxProvider";
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
import { BrandingProvider } from "@/providers/BrandingProvider";
import {
  PLATFORM_DESCRIPTION,
  PLATFORM_NAME,
} from "@/config/platformBranding";

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
  title: PLATFORM_NAME,
  description: PLATFORM_DESCRIPTION,
  applicationName: PLATFORM_NAME,
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
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
                <AuthInitializer>
                  <BrandingProvider>{children}</BrandingProvider>
                </AuthInitializer>
              </BreadcrumbProvider>
            </NextIntlClientProvider>
          </ReduxProvider>
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
