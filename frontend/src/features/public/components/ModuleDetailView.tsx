"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import type { PlatformModule } from "@/features/public/config/modules";
import { CTASection } from "./CTASection";
import { FeatureGrid, type FeatureItem } from "./FeatureGrid";
import { PublicPageHero } from "./PublicPageHero";
import { HealthcareTimeline } from "./HealthcareTimeline";
import { SectionHeader } from "./SectionReveal";

export function ModuleDetailView({ module }: { module: PlatformModule }) {
  const Icon = module.icon;
  const features: FeatureItem[] = module.features.map((f) => ({
    title: f,
    description: "Enterprise-ready capability integrated across the NovaCure ecosystem.",
    icon: CheckCircle2,
  }));

  return (
    <>
      <PublicPageHero
        eyebrow="Module"
        title={module.title}
        description={module.description}
      />
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 p-6">
            <div className="rounded-xl bg-section-accent-subtle-20 p-4 text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <p className="text-muted-foreground">{module.shortDescription}</p>
          </div>
          <SectionHeader title="Key capabilities" align="left" />
          <FeatureGrid items={features} columns={2} />
          <HealthcareTimeline steps={module.workflow} title="Typical workflow" />
          <div className="mt-12 rounded-2xl border border-border/60 bg-section-accent-subtle-10 p-6">
            <h3 className="text-lg font-semibold text-foreground">Benefits</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {module.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CTASection
        title={`Deploy ${module.title} in your organization`}
        description="Schedule a demo to see this module integrated with your existing workflows."
      />
    </>
  );
}
