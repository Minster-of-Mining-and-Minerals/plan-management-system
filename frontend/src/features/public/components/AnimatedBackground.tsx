"use client";

import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-section-accent-subtle-20 blur-3xl" />
      <motion.div
        className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-section-accent-subtle-30 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-section-accent-subtle-10 blur-3xl" />
      <motion.div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--section-accent-subtle-40)) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        animate={{ backgroundPosition: ["0px 0px", "28px 28px"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
