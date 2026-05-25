"use client";

import type { LucideIcon } from "lucide-react";
import { CTASection } from "../components/CTASection";
import { FeatureGrid, type FeatureItem } from "../components/FeatureGrid";
import { PublicPageHero } from "../components/PublicPageHero";

export type MarketingPageContent = {
  eyebrow?: string;
  title: string;
  description: string;
  features?: FeatureItem[];
  ctaTitle?: string;
  ctaDescription?: string;
};

export function MarketingPageLayout({
  eyebrow,
  title,
  description,
  features = [],
  ctaTitle,
  ctaDescription,
  children,
}: MarketingPageContent & { children?: React.ReactNode }) {
  return (
    <>
      <PublicPageHero eyebrow={eyebrow} title={title} description={description} />
      {features.length > 0 && (
        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FeatureGrid items={features} columns={3} />
          </div>
        </section>
      )}
      {children}
      <CTASection title={ctaTitle} description={ctaDescription} />
    </>
  );
}
