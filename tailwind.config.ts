import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./client/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-background) / <alpha-value>)',
        foreground: 'hsl(var(--color-foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--color-card) / <alpha-value>)',
          foreground: 'hsl(var(--color-card-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-card-border) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--color-popover) / <alpha-value>)',
          foreground: 'hsl(var(--color-popover-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-popover-border) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          foreground: 'hsl(var(--color-primary-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-primary-border) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary) / <alpha-value>)',
          foreground: 'hsl(var(--color-secondary-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-secondary-border) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted) / <alpha-value>)',
          foreground: 'hsl(var(--color-muted-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-muted-border) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
          foreground: 'hsl(var(--color-accent-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-accent-border) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive) / <alpha-value>)',
          foreground: 'hsl(var(--color-destructive-foreground) / <alpha-value>)',
          border: 'hsl(var(--color-destructive-border) / <alpha-value>)',
        },
        border: 'hsl(var(--color-border) / <alpha-value>)',
        input: 'hsl(var(--color-input) / <alpha-value>)',
        ring: 'hsl(var(--color-ring) / <alpha-value>)',
        chart: {
          '1': 'hsl(var(--color-chart-1) / <alpha-value>)',
          '2': 'hsl(var(--color-chart-2) / <alpha-value>)',
          '3': 'hsl(var(--color-chart-3) / <alpha-value>)',
          '4': 'hsl(var(--color-chart-4) / <alpha-value>)',
          '5': 'hsl(var(--color-chart-5) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--color-sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--color-sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--color-sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--color-sidebar-primary-foreground) / <alpha-value>)',
          'primary-border': 'hsl(var(--color-sidebar-primary-border) / <alpha-value>)',
          accent: 'hsl(var(--color-sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--color-sidebar-accent-foreground) / <alpha-value>)',
          'accent-border': 'hsl(var(--color-sidebar-accent-border) / <alpha-value>)',
          border: 'hsl(var(--color-sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--color-sidebar-ring) / <alpha-value>)',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
