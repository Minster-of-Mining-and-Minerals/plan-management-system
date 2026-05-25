"use client";

import { TRUST_INDICATORS } from "@/features/public/config/navigation";
import { SectionHeader } from "./SectionReveal";

export function TrustSection() {
  return (
    <section className="border-y border-border/50 bg-card/40 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Trusted Healthcare"
          title="Built for enterprise health systems"
          description="NovaCure supports hospitals, clinics, and integrated care networks with AI-driven operations and medical-grade reliability."
          align="center"
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {TRUST_INDICATORS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl border border-border/50 bg-background/60 p-4 text-center"
            >
              <Icon className="mb-2 h-6 w-6 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
