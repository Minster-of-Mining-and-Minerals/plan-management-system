"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CORE_SERVICES, PLATFORM_MODULES } from "@/features/public/config/modules";
import { ModuleCard } from "./ModuleCard";
import { SectionHeader } from "./SectionReveal";

export function ServiceShowcase() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Core Services"
          title="Every clinical and operational capability in one platform"
          description="From EMR to AI analytics — modular, integrated, and ready for enterprise deployment."
        />
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {CORE_SERVICES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {s.title}
            </Link>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_MODULES.slice(0, 6).map((mod, i) => (
            <ModuleCard key={mod.slug} module={mod} index={i} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/modules"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View all modules <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
