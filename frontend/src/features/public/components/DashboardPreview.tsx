"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const flowData = [
  { name: "Mon", patients: 120, revenue: 42 },
  { name: "Tue", patients: 148, revenue: 51 },
  { name: "Wed", patients: 132, revenue: 47 },
  { name: "Thu", patients: 165, revenue: 58 },
  { name: "Fri", patients: 178, revenue: 62 },
  { name: "Sat", patients: 98, revenue: 34 },
  { name: "Sun", patients: 86, revenue: 29 },
];

const kpis = [
  { label: "Active Patients", value: "12.4K" },
  { label: "Bed Occupancy", value: "87%" },
  { label: "Revenue MTD", value: "$2.1M" },
];

export function DashboardPreview() {
  return (
    <motion.div
      className="relative rounded-2xl border border-border/60 bg-card/80 p-4 shadow-2xl shadow-section-accent-subtle-30 backdrop-blur-xl sm:p-6"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <motion.div
        className="absolute -inset-px rounded-2xl bg-gradient-to-br from-section-accent-subtle-40 via-transparent to-section-accent-subtle-20 opacity-70"
        aria-hidden
      />
      <motion.div className="relative space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Operations Command
            </p>
            <p className="text-lg font-semibold text-foreground">
              Real-time Health Intelligence
            </p>
          </div>
          <span className="rounded-full bg-section-accent-subtle-20 px-3 py-1 text-xs font-semibold text-primary">
            Live
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="rounded-xl border border-border/50 bg-background/70 p-3"
            >
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="text-sm font-bold text-primary">{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-36 rounded-xl border border-border/50 bg-background/60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData}>
                <defs>
                  <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="hsl(var(--primary))"
                  fill="url(#patientGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-36 rounded-xl border border-border/50 bg-background/60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData}>
                <XAxis dataKey="name" hide />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--section-emphasis))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
