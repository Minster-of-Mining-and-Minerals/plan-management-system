import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,jsx,ts,tsx}",
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
          "nav-hover": "hsl(var(--sidebar-nav-hover))",
          "nav-active": "hsl(var(--sidebar-nav-active))",
          "nav-active-foreground": "hsl(var(--sidebar-nav-active-foreground))",
          "subnav-active": "hsl(var(--sidebar-subnav-active))",
          "subnav-active-foreground": "hsl(var(--sidebar-subnav-active-foreground))",
          "header-text": "hsl(var(--sidebar-header-text))",
        },
        toolbar: {
          DEFAULT: "hsl(var(--toolbar-button))",
          hover: "hsl(var(--toolbar-button-hover))",
          foreground: "hsl(var(--toolbar-button-foreground))",
        },
        "table-header": {
          DEFAULT: "hsl(var(--table-header))",
          hover: "hsl(var(--table-header-hover))",
          foreground: "hsl(var(--table-header-foreground))",
        },
        header: {
          DEFAULT: "hsl(var(--header-background))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
        },
        golden: {
          dark: "hsl(var(--golden-dark))",
          metallic: "hsl(var(--golden-metallic))",
          soft: "hsl(var(--golden-soft))",
          classic: "hsl(var(--golden-classic))",
          darkHover: "hsl(var(--golden-dark-hover))",
          darkLight: "hsl(var(--golden-dark-light))",
          dark10: "hsl(var(--golden-dark-10))",
          dark20: "hsl(var(--golden-dark-20))",
          dark30: "hsl(var(--golden-dark-30))",
          dark40: "hsl(var(--golden-dark-40))",
          dark50: "hsl(var(--golden-dark-50))",
          dark60: "hsl(var(--golden-dark-60))",
          dark70: "hsl(var(--golden-dark-70))",
          dark80: "hsl(var(--golden-dark-80))",
          dark90: "hsl(var(--golden-dark-90))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

    },
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;

export default config;