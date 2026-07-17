"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import { hexToRgba } from "../utils/dashboardAppearanceUtils";
import type { BrandingTone } from "../utils/dashboardAppearanceUtils";

type PanelVariant = "default" | "gradient" | "accent" | "muted" | "inset";

interface AnalyticsPanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: BrandingTone;
  variant?: PanelVariant;
  className?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AnalyticsPanel({
  title,
  description,
  icon: Icon,
  tone = "primary",
  variant = "default",
  className,
  headerAction,
  children,
}: AnalyticsPanelProps) {
  const { tone: toneStyles, textPrimary, surface } = useDashboardAppearance();
  const accent = toneStyles(tone);

  const panelStyle =
    variant === "gradient"
      ? {
          background: accent.gradientBackground,
          borderColor: accent.borderColor,
        }
      : variant === "accent"
        ? {
            borderLeftColor: accent.color,
            borderLeftWidth: 4,
            backgroundColor: surface,
          }
        : variant === "muted"
          ? { backgroundColor: hexToRgba(surface, 0.6) }
          : undefined;

  return (
    <section
      className={cn(
        "rounded-xl overflow-hidden border shadow-sm",
        variant === "inset" && "border-dashed bg-muted/20 shadow-none",
        variant === "default" && "bg-white",
        className
      )}
      style={panelStyle}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className="rounded-xl p-2.5 shrink-0"
              style={{
                backgroundColor: accent.iconBackground,
                color: accent.iconColor,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold truncate" style={{ color: textPrimary }}>
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {headerAction}
      </div>
      <div className="min-w-0 p-5">{children}</div>
    </section>
  );
}

export function DashboardSectionHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: string;
}) {
  const { tone, textPrimary, color } = useDashboardAppearance();
  const primary = tone("primary");
  const accent = tone("accent");

  return (
    <div
      className="relative overflow-hidden rounded-2xl border px-5 py-4 sm:px-6"
      style={{
        background: `linear-gradient(120deg, ${hexToRgba(primary.color, 0.12)} 0%, #ffffff 55%, ${hexToRgba(accent.color, 0.08)} 100%)`,
        borderColor: hexToRgba(primary.color, 0.15),
      }}
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl"
        style={{ backgroundColor: hexToRgba(primary.color, 0.12) }}
      />
      <div
        className="absolute -left-4 bottom-0 h-20 w-20 rounded-full blur-xl"
        style={{ backgroundColor: hexToRgba(accent.color, 0.15) }}
      />
      <div className="relative flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: textPrimary }}>
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl">{description}</p>
          )}
        </div>
        {badge && (
          <span
            className="ml-auto rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider border"
            style={{
              color: color("primary"),
              borderColor: hexToRgba(color("primary"), 0.2),
              backgroundColor: hexToRgba(color("primary"), 0.08),
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
