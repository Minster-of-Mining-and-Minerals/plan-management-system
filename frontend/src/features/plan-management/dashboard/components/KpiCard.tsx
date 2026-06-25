"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import type { BrandingTone } from "../utils/dashboardAppearanceUtils";
import { hexToRgba } from "../utils/dashboardAppearanceUtils";

type KpiVariant = "default" | "gradient" | "solid" | "outline";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  variant?: KpiVariant;
  accent?: BrandingTone;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  variant = "default",
  accent = "primary",
}: KpiCardProps) {
  const { tone, color, textPrimary, textSecondary } = useDashboardAppearance();
  const styles = tone(accent);
  const isSolid = variant === "solid";

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-all duration-300 hover:shadow-md",
        variant === "default" && "bg-white shadow-sm",
        variant === "outline" && "bg-white shadow-sm border-dashed",
        variant === "gradient" && "shadow-sm",
        variant === "solid" && "shadow-md",
        className
      )}
      style={
        variant === "gradient"
          ? {
              background: styles.gradientBackground,
              borderColor: styles.borderColor,
            }
          : variant === "solid"
            ? {
                backgroundColor: styles.solidBackground,
                borderColor: styles.solidBackground,
                color: styles.solidText,
              }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: isSolid ? hexToRgba(styles.solidText, 0.85) : textSecondary }}
          >
            {title}
          </p>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: isSolid ? styles.solidText : textPrimary }}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className="text-xs"
              style={{ color: isSolid ? hexToRgba(styles.solidText, 0.75) : textSecondary }}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className="text-xs font-medium"
              style={{ color: isSolid ? hexToRgba(styles.solidText, 0.85) : color("success") }}
            >
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="rounded-xl p-2.5 shrink-0"
            style={
              isSolid
                ? {
                    backgroundColor: hexToRgba(styles.solidText, 0.18),
                    color: styles.solidText,
                  }
                : {
                    backgroundColor: styles.iconBackground,
                    color: styles.iconColor,
                  }
            }
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
