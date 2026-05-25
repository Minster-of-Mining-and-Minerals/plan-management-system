"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandingContent } from "@/features/public/hooks/useBrandingContent";

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CTASection({
  title,
  description,
  primaryHref = "/demo",
  primaryLabel = "Request Demo",
  secondaryHref = "/contact",
  secondaryLabel = "Contact Sales",
}: CTASectionProps) {
  const { displayName } = useBrandingContent();

  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-section-accent-subtle-20 via-card to-section-accent-subtle-10 p-8 md:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-section-accent-subtle-30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title ?? `Transform healthcare with ${displayName}`}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {description ??
                "Partner with us to deploy an enterprise-grade digital health ecosystem built for scale, security, and intelligent operations."}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-card/60">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
