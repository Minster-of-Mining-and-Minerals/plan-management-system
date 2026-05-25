"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { LANDING_STATS } from "@/features/public/config/modules";

interface AnimatedStatsProps {
  className?: string;
}

export function AnimatedStats({ className = "" }: AnimatedStatsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div
      ref={ref}
      className={`grid grid-cols-2 gap-4 sm:grid-cols-4 ${className}`}
    >
      {LANDING_STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="rounded-xl border border-border/60 bg-card/70 p-4 text-center backdrop-blur-sm"
        >
          <p className="text-2xl font-bold text-primary">{stat.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function CountUpStat({ value, label }: { value: string; label: string }) {
  const numeric = parseInt(value.replace(/\D/g, ""), 10);
  const suffix = value.replace(/[0-9]/g, "");
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || Number.isNaN(numeric)) return;
    let frame = 0;
    const totalFrames = 40;
    const id = setInterval(() => {
      frame += 1;
      setDisplay(Math.round((numeric * frame) / totalFrames));
      if (frame >= totalFrames) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [inView, numeric]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl font-bold text-primary">
        {Number.isNaN(numeric) ? value : `${display}${suffix}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
