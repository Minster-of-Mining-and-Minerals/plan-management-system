"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ECOSYSTEM_FLOW } from "@/features/public/config/modules";
import { SectionHeader, SectionReveal } from "./SectionReveal";

export function EcosystemFlow() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Platform Ecosystem"
          title="Connected care from intake to intelligence"
          description="Every module shares data across a unified digital health fabric — reducing silos and accelerating decisions."
        />
        <SectionReveal>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {ECOSYSTEM_FLOW.map((step, i) => (
              <motion.div
                key={step}
                className="flex items-center gap-2 md:gap-3"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="rounded-xl border border-primary/20 bg-card/80 px-4 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm md:px-5 md:py-4 md:text-base">
                  {step}
                </div>
                {i < ECOSYSTEM_FLOW.length - 1 && (
                  <ChevronRight className="hidden h-5 w-5 text-section-accent sm:block" />
                )}
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
