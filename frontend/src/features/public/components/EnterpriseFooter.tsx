"use client";

import Link from "next/link";
import { BrandingLogo, BrandingName } from "@/components/common/BrandingLogo";
import { FOOTER_COLUMNS } from "@/features/public/config/navigation";
import { useBrandingContent } from "@/features/public/hooks/useBrandingContent";
import { useLocale } from "next-intl";

export function EnterpriseFooter() {
  const locale = useLocale() as "en" | "am";
  const { tagline } = useBrandingContent(locale);

  return (
    <footer className="border-t border-auth-panel bg-auth-background text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <BrandingLogo variant="compact" width={40} height={40} />
              <BrandingName locale={locale} className="text-lg font-semibold text-primary-foreground" />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              {tagline}. Enterprise healthcare ecosystem for hospitals, clinics, and intelligent care delivery.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-section-emphasis"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-auth-panel pt-8 sm:flex-row">
          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} NovaCure. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-primary-foreground/60">
            <Link href="/security" className="transition-colors hover:text-section-emphasis">
              Security
            </Link>
            <Link href="/faq" className="transition-colors hover:text-section-emphasis">
              FAQ
            </Link>
            <Link href="/contact" className="transition-colors hover:text-section-emphasis">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
