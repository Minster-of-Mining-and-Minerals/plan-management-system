import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        auth: {
          background: "hsl(var(--auth-background))",
          panel: "hsl(var(--auth-panel-border))",
        },
        table: {
          stripe: "hsl(var(--table-stripe))",
        },
        "section-accent": "hsl(var(--section-accent))",
        "section-accent-hover": "hsl(var(--section-accent-hover))",
        "section-accent-muted": "hsl(var(--section-accent-muted))",
        "section-emphasis": "hsl(var(--section-emphasis))",
        "section-accent-subtle-10": "hsl(var(--section-accent-subtle-10))",
        "section-accent-subtle-20": "hsl(var(--section-accent-subtle-20))",
        "section-accent-subtle-30": "hsl(var(--section-accent-subtle-30))",
        "section-accent-subtle-40": "hsl(var(--section-accent-subtle-40))",
        "section-accent-subtle-50": "hsl(var(--section-accent-subtle-50))",
        "section-accent-subtle-60": "hsl(var(--section-accent-subtle-60))",
        "section-accent-subtle-70": "hsl(var(--section-accent-subtle-70))",
        "section-accent-subtle-80": "hsl(var(--section-accent-subtle-80))",
        "section-accent-subtle-90": "hsl(var(--section-accent-subtle-90))",
        "sidebar-hover": "hsl(var(--sidebar-hover))",
        "header-surface": "hsl(var(--header-surface))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;