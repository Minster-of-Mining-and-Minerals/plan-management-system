"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandingContent } from "@/features/public/hooks/useBrandingContent";
import { AnimatedBackground } from "./AnimatedBackground";
import { AnimatedStats } from "./AnimatedStats";
import { DashboardPreview } from "./DashboardPreview";

export function HeroSection() {
  const { displayName, tagline, description } = useBrandingContent();

  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      <AnimatedBackground />
      <motion.div
        className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        <div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-section-accent-subtle-40 bg-card/70 px-4 py-2 text-sm font-medium text-primary backdrop-blur-md"
          >
            <Sparkles className="h-4 w-4 text-section-accent" />
            <span>{tagline.toUpperCase()}</span>
          </motion.div>

          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {displayName}
            <span className="mt-2 block bg-gradient-to-r from-primary via-section-accent to-section-emphasis bg-clip-text text-transparent">
              Digital Health Ecosystem
            </span>
          </motion.h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 },
            }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 },
            }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/30 bg-card/60 backdrop-blur-sm">
              <Link href="/modules">Explore Modules</Link>
            </Button>
          </motion.div>

          <AnimatedStats className="mt-12" />
        </div>

        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.96, y: 24 },
            visible: { opacity: 1, scale: 1, y: 0 },
          }}
          className="relative"
        >
          <DashboardPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}
