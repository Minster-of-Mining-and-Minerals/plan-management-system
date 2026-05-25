"use client";

import { HeroSection } from "./HeroSection";
import { TrustSection } from "./TrustSection";
import { ServiceShowcase } from "./ServiceShowcase";
import { EcosystemFlow } from "./EcosystemFlow";
import { AIShowcase } from "./AIShowcase";
import {
  DoctorExperienceSection,
  PatientExperienceSection,
} from "./ExperienceSections";
import { AnalyticsPreviewSection } from "./AnalyticsPreviewSection";
import { SecuritySection } from "./SecuritySection";
import { CTASection } from "./CTASection";
import { TestimonialSection } from "./TestimonialSection";

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <ServiceShowcase />
      <EcosystemFlow />
      <AIShowcase />
      <PatientExperienceSection />
      <DoctorExperienceSection />
      <AnalyticsPreviewSection />
      <SecuritySection />
      <TestimonialSection />
      <CTASection />
    </>
  );
}
