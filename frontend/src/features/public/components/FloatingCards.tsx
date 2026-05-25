"use client";

import { motion } from "framer-motion";
import { Activity, Brain, HeartPulse } from "lucide-react";

const cards = [
  { title: "Risk Score", value: "Low", icon: HeartPulse, delay: 0 },
  { title: "AI Insight", value: "Follow-up suggested", icon: Brain, delay: 0.15 },
  { title: "Flow Status", value: "Optimal", icon: Activity, delay: 0.3 },
];

export function FloatingCards() {
  return (
    <div className="relative mx-auto h-80 w-full max-w-md">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            className="absolute w-56 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl backdrop-blur-md"
            style={{
              left: i === 0 ? "0%" : i === 1 ? "20%" : "10%",
              top: i === 0 ? "10%" : i === 1 ? "38%" : "62%",
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: card.delay,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-section-accent-subtle-20 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-sm font-semibold text-foreground">{card.value}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
