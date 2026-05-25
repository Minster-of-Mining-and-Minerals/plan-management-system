"use client";

import { SectionHeader } from "./SectionReveal";

const TESTIMONIALS = [
  {
    quote:
      "NovaCure unified our clinical and operational teams on one platform — we finally have real-time visibility across the hospital.",
    role: "Chief Medical Officer",
    org: "Regional Health System",
  },
  {
    quote:
      "The modular architecture let us roll out EMR, lab, and billing in phases without disrupting care delivery.",
    role: "Director of IT",
    org: "Multi-site Clinic Network",
  },
  {
    quote:
      "AI-driven analytics surfaced bottlenecks we couldn't see before. Occupancy and revenue metrics are now board-ready.",
    role: "Hospital Administrator",
    org: "Academic Medical Center",
  },
];

export function TestimonialSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Enterprise Trust"
          title="Trusted by healthcare leaders"
          description="Organizations choose NovaCure to modernize care delivery with confidence."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.org}
              className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">{t.role}</span>
                <span className="block">{t.org}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
