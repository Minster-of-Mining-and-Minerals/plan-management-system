"use client";

import { Brain, LineChart, ShieldCheck, Zap } from "lucide-react";
import { FeatureGrid } from "./FeatureGrid";
import { FloatingCards } from "./FloatingCards";
import { SectionHeader } from "./SectionReveal";

const AI_FEATURES = [
  {
    title: "Clinical Decision Support",
    description: "AI-assisted suggestions grounded in patient context and institutional protocols.",
    icon: Brain,
  },
  {
    title: "Risk Scoring",
    description: "Predict deterioration, readmissions, and operational bottlenecks before they escalate.",
    icon: ShieldCheck,
  },
  {
    title: "Predictive Analytics",
    description: "Forecast demand, staffing needs, and resource utilization across departments.",
    icon: LineChart,
  },
  {
    title: "Intelligent Automation",
    description: "Automate routing, notifications, and workflow handoffs across the care continuum.",
    icon: Zap,
  },
];

export function AIShowcase() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-section-accent-subtle-10 via-transparent to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="AI Health Engine"
              title="Intelligence embedded across every workflow"
              description="NovaCure's AI layer augments clinicians and administrators with predictive insights — never replacing human judgment."
              align="left"
            />
            <FeatureGrid items={AI_FEATURES} columns={2} />
          </div>
          <FloatingCards />
        </div>
      </div>
    </section>
  );
}
