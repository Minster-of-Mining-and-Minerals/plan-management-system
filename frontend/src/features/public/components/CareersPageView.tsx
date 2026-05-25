"use client";

import { MapPin, Users } from "lucide-react";
import { CAREER_ROLES } from "@/features/public/config/pagesContent";
import { CTASection } from "./CTASection";
import { PublicPageHero } from "./PublicPageHero";

export function CareersPageView() {
  return (
    <>
      <PublicPageHero
        eyebrow="Careers"
        title="Join the NovaCure mission"
        description="Help transform healthcare through intelligent, enterprise-grade digital platforms."
      />
      <section className="pb-20">
        <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6 lg:px-8">
          {CAREER_ROLES.map((role) => (
            <article
              key={role.title}
              className="rounded-xl border border-border/60 bg-card/70 p-6 transition-colors hover:border-primary/30"
            >
              <h3 className="text-lg font-semibold text-foreground">{role.title}</h3>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  {role.team}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {role.location}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Interested in this role? Reach out via our contact form with the position title.
              </p>
            </article>
          ))}
        </div>
      </section>
      <CTASection
        title="Don't see the right role?"
        description="We're always looking for exceptional talent in engineering, product, and healthcare solutions."
        primaryHref="/contact"
        primaryLabel="Get in Touch"
      />
    </>
  );
}
