"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FAQ_ITEMS } from "@/features/public/config/pagesContent";
import { CTASection } from "./CTASection";
import { PublicPageHero } from "./PublicPageHero";

export function FaqPageView() {
  return (
    <>
      <PublicPageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Answers to common questions about NovaCure, deployment, AI, and enterprise licensing."
      />
      <section className="pb-20">
        <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6 lg:px-8">
          {FAQ_ITEMS.map((item) => (
            <Collapsible
              key={item.q}
              className="rounded-xl border border-border/60 bg-card/70 px-4"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground [&[data-state=open]>svg]:rotate-180">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </section>
      <CTASection
        title="Still have questions?"
        description="Our team can walk you through modules, deployment options, and enterprise licensing."
        primaryHref="/contact"
        primaryLabel="Contact Us"
      />
    </>
  );
}
