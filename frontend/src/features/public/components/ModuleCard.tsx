"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PlatformModule } from "@/features/public/config/modules";
import { SectionReveal } from "./SectionReveal";

export function ModuleCard({ module, index = 0 }: { module: PlatformModule; index?: number }) {
  const Icon = module.icon;

  return (
    <SectionReveal delay={index * 0.05}>
      <Link
        href={module.href}
        className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-section-accent-subtle-20"
      >
        <div className="mb-4 inline-flex rounded-xl bg-section-accent-subtle-20 p-3 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{module.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {module.shortDescription}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Explore module
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </SectionReveal>
  );
}
