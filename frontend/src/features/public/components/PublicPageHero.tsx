"use client";

import { AnimatedBackground } from "./AnimatedBackground";

interface PublicPageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function PublicPageHero({ eyebrow, title, description }: PublicPageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-20">
      <AnimatedBackground />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow && (
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-section-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
