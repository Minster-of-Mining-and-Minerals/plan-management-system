export const REGIONAL_PALETTE = {
  emerald: {
    DEFAULT: "#059669",
    dark: "#047857",
    light: "#10b981",
    subtle: "#ecfdf5",
    border: "#a7f3d0",
  },
  amber: {
    DEFAULT: "#d97706",
    dark: "#b45309",
    light: "#f59e0b",
    subtle: "#fffbeb",
    border: "#fde68a",
  },
  teal: {
    DEFAULT: "#0d9488",
    dark: "#0f766e",
    light: "#14b8a6",
    subtle: "#f0fdfa",
    border: "#99f6e4",
  },
  indigo: {
    DEFAULT: "#4f46e5",
    dark: "#4338ca",
    light: "#6366f1",
    subtle: "#eef2ff",
    border: "#c7d2fe",
  },
  slate: {
    DEFAULT: "#475569",
    dark: "#334155",
    light: "#64748b",
    subtle: "#f8fafc",
    border: "#cbd5e1",
  },
  rose: {
    DEFAULT: "#e11d48",
    dark: "#be123c",
    light: "#f43f5e",
    subtle: "#fff1f2",
    border: "#fecdd3",
  },
} as const;

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPerformanceBadgeDetails(performance: "excellent" | "good" | "average" | "at-risk") {
  switch (performance) {
    case "excellent":
      return {
        label: "Excellent (≥85%)",
        color: REGIONAL_PALETTE.emerald.DEFAULT,
        bgColor: REGIONAL_PALETTE.emerald.subtle,
        borderColor: REGIONAL_PALETTE.emerald.border,
        textColor: REGIONAL_PALETTE.emerald.dark,
      };
    case "good":
      return {
        label: "Good (70-84%)",
        color: REGIONAL_PALETTE.teal.DEFAULT,
        bgColor: REGIONAL_PALETTE.teal.subtle,
        borderColor: REGIONAL_PALETTE.teal.border,
        textColor: REGIONAL_PALETTE.teal.dark,
      };
    case "average":
      return {
        label: "Average (50-69%)",
        color: REGIONAL_PALETTE.amber.DEFAULT,
        bgColor: REGIONAL_PALETTE.amber.subtle,
        borderColor: REGIONAL_PALETTE.amber.border,
        textColor: REGIONAL_PALETTE.amber.dark,
      };
    case "at-risk":
    default:
      return {
        label: "At-Risk (<50%)",
        color: REGIONAL_PALETTE.rose.DEFAULT,
        bgColor: REGIONAL_PALETTE.rose.subtle,
        borderColor: REGIONAL_PALETTE.rose.border,
        textColor: REGIONAL_PALETTE.rose.dark,
      };
  }
}

export function getStatusBadgeDetails(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
      return {
        label: "Completed",
        color: REGIONAL_PALETTE.emerald.DEFAULT,
        bg: REGIONAL_PALETTE.emerald.subtle,
        border: REGIONAL_PALETTE.emerald.border,
        text: REGIONAL_PALETTE.emerald.dark,
      };
    case "delayed":
      return {
        label: "Delayed",
        color: REGIONAL_PALETTE.rose.DEFAULT,
        bg: REGIONAL_PALETTE.rose.subtle,
        border: REGIONAL_PALETTE.rose.border,
        text: REGIONAL_PALETTE.rose.dark,
      };
    case "draft":
      return {
        label: "Draft",
        color: REGIONAL_PALETTE.slate.DEFAULT,
        bg: REGIONAL_PALETTE.slate.subtle,
        border: REGIONAL_PALETTE.slate.border,
        text: REGIONAL_PALETTE.slate.dark,
      };
    case "active":
    default:
      return {
        label: "Active Execution",
        color: REGIONAL_PALETTE.teal.DEFAULT,
        bg: REGIONAL_PALETTE.teal.subtle,
        border: REGIONAL_PALETTE.teal.border,
        text: REGIONAL_PALETTE.teal.dark,
      };
  }
}

