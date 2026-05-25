"use client";

import { DashboardPreview } from "./DashboardPreview";
import { SectionHeader } from "./SectionReveal";

export function AnalyticsPreviewSection() {
  return (
    <section className="border-y border-border/50 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Analytics"
          title="Operational intelligence for leaders and clinicians"
          description="Monitor occupancy, patient flow, revenue, and quality metrics from a unified command view."
        />
        <div className="mx-auto max-w-4xl">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
