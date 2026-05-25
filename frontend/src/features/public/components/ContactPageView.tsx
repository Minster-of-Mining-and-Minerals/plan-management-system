"use client";

import { PublicPageHero } from "./PublicPageHero";
import { PublicContactForm } from "./PublicContactForm";
import { CTASection } from "./CTASection";

export function ContactPageView() {
  return (
    <>
      <PublicPageHero
        eyebrow="Contact"
        title="Talk to our team"
        description="Questions about NovaCure, enterprise licensing, or implementation — we're here to help."
      />
      <section className="pb-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-4 text-muted-foreground">
            <p className="text-sm leading-relaxed">
              Reach out for sales inquiries, technical questions, or partnership discussions.
              Our team typically responds within one business day.
            </p>
            <div className="rounded-xl border border-border/60 bg-card/60 p-6 text-sm">
              <p className="font-semibold text-foreground">Enterprise sales</p>
              <p className="mt-2">Hospitals, clinics, and health networks</p>
              <p className="mt-4 font-semibold text-foreground">Support</p>
              <p className="mt-2">Existing customers — use your portal credentials</p>
            </div>
          </div>
          <PublicContactForm topic="Contact" />
        </div>
      </section>
      <CTASection
        title="Prefer a live walkthrough?"
        description="Schedule a personalized demo of the modules that matter most to your organization."
        primaryHref="/demo"
        primaryLabel="Request Demo"
      />
    </>
  );
}

export function DemoPageView() {
  return (
    <>
      <PublicPageHero
        eyebrow="Demo"
        title="Request a personalized demo"
        description="See NovaCure in action — tailored to your clinical, operational, and analytics priorities."
      />
      <section className="pb-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <PublicContactForm submitLabel="Request Demo" topic="Demo Request" />
        </div>
      </section>
    </>
  );
}
