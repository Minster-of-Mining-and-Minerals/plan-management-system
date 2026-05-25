"use client";

import { PLATFORM_MODULES } from "@/features/public/config/modules";
import { ModuleCard } from "./ModuleCard";
import { PublicPageHero } from "./PublicPageHero";
import { CTASection } from "./CTASection";
import { SectionHeader } from "./SectionReveal";

export function ModulesShowcasePage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Modules"
        title="Every capability your health system needs"
        description="Explore NovaCure modules — deploy individually or as a unified ecosystem with shared identity, data, and analytics."
      />
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Platform modules"
            description="Click any module to see capabilities, workflows, and benefits."
            align="left"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_MODULES.map((mod, i) => (
              <ModuleCard key={mod.slug} module={mod} index={i} />
            ))}
          </div>
        </div>
      </section>
      <CTASection />
    </>
  );
}
