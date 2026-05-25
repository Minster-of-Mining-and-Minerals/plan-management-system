"use client";

import { SectionHeader } from "./SectionReveal";

export function HealthcareTimeline({
  steps,
  title = "Care pathway",
}: {
  steps: string[];
  title?: string;
}) {
  return (
    <section className="mt-16">
      <SectionHeader title={title} align="left" />
      <ol className="relative border-l border-primary/30 pl-6">
        {steps.map((step, i) => (
          <li key={step} className="mb-8 ml-2">
            <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
            <p className="text-sm font-semibold text-foreground">
              Step {i + 1}: {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
