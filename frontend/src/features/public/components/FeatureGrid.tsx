"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionReveal } from "./SectionReveal";

export type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}

export function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  const colClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-6 ${colClass}`}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const inner = (
          <SectionReveal
            delay={i * 0.06}
            className="group h-full rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-section-accent-subtle-20"
          >
            <div className="mb-4 inline-flex rounded-xl bg-section-accent-subtle-20 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            {item.href && (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowUpRight className="h-4 w-4" />
              </span>
            )}
          </SectionReveal>
        );

        return item.href ? (
          <Link key={item.title} href={item.href} className="block h-full">
            {inner}
          </Link>
        ) : (
          <div key={item.title}>{inner}</div>
        );
      })}
    </div>
  );
}
