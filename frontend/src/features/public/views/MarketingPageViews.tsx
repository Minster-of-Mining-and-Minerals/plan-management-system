"use client";

import { AIShowcase } from "../components/AIShowcase";
import { AnalyticsPreviewSection } from "../components/AnalyticsPreviewSection";
import {
  DoctorExperienceSection,
  PatientExperienceSection,
} from "../components/ExperienceSections";
import { PublicContactForm } from "../components/PublicContactForm";
import { ServiceShowcase } from "../components/ServiceShowcase";
import { SecuritySection } from "../components/SecuritySection";
import {
  ABOUT_PAGE,
  AI_HEALTH_PAGE,
  ANALYTICS_PAGE,
  DOCTOR_EXPERIENCE_PAGE,
  HOSPITAL_SOLUTIONS_PAGE,
  PATIENT_EXPERIENCE_PAGE,
  PARTNERSHIP_PAGE,
  PRICING_PAGE,
  SECURITY_PAGE,
  SERVICES_PAGE,
  TELEMEDICINE_PAGE,
} from "../config/pagesContent";
import { MarketingPageLayout } from "../templates/MarketingPageLayout";

export function AboutPageView() {
  return <MarketingPageLayout {...ABOUT_PAGE} />;
}

export function ServicesPageView() {
  return (
    <MarketingPageLayout {...SERVICES_PAGE}>
      <ServiceShowcase />
    </MarketingPageLayout>
  );
}

export function AIHealthPageView() {
  return (
    <MarketingPageLayout {...AI_HEALTH_PAGE}>
      <AIShowcase />
    </MarketingPageLayout>
  );
}

export function TelemedicinePageView() {
  return <MarketingPageLayout {...TELEMEDICINE_PAGE} />;
}

export function AnalyticsPageView() {
  return (
    <MarketingPageLayout {...ANALYTICS_PAGE}>
      <AnalyticsPreviewSection />
    </MarketingPageLayout>
  );
}

export function PatientExperiencePageView() {
  return (
    <MarketingPageLayout {...PATIENT_EXPERIENCE_PAGE}>
      <PatientExperienceSection />
    </MarketingPageLayout>
  );
}

export function DoctorExperiencePageView() {
  return (
    <MarketingPageLayout {...DOCTOR_EXPERIENCE_PAGE}>
      <DoctorExperienceSection />
    </MarketingPageLayout>
  );
}

export function HospitalSolutionsPageView() {
  return <MarketingPageLayout {...HOSPITAL_SOLUTIONS_PAGE} />;
}

export function SecurityPageView() {
  return (
    <MarketingPageLayout {...SECURITY_PAGE}>
      <SecuritySection />
    </MarketingPageLayout>
  );
}

export function PricingPageView() {
  return (
    <MarketingPageLayout {...PRICING_PAGE}>
      <section className="pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <PublicContactForm topic="Enterprise Pricing" submitLabel="Request Quote" />
        </div>
      </section>
    </MarketingPageLayout>
  );
}

export function PartnershipPageView() {
  return (
    <MarketingPageLayout {...PARTNERSHIP_PAGE}>
      <section className="pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <PublicContactForm topic="Partnership" submitLabel="Explore Partnership" />
        </div>
      </section>
    </MarketingPageLayout>
  );
}
