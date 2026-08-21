/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        anthracite: {
          950: '#1B1B1E',
          900: '#26262A',
          800: '#2E2E33',
          700: '#3A3A40',
        },
        terracotta: {
          300: '#E8B4A4',
          400: '#D98E7B',
          500: '#C96F5A',
        },
        neutral: {
          100: '#F4F2F0',
          200: '#E8E5E1',
          500: '#9A9AA0',
        },
        ink: '#232326',
        success: '#6FA287',
        pending: '#C98850',
        error: '#C0524A',
        info: '#7B8FA6',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        // Traînée de lumière sur la jointure de PhotoSplitCinematique, au
        // moment où les deux moitiés de la photo se rejoignent. Délai calé
        // sur les valeurs par défaut de halfDuration/halfStagger (2000ms/
        // 180ms, cf. ce composant) — à réajuster si ces valeurs changent.
        "light-leak": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // Anneaux concentriques qui pulsent depuis le pin de la carte
        // stylisée du Lieu (DetailsSombre) — boucle infinie, ne démarre
        // qu'une fois la section révélée au scroll (les <circle> ne sont
        // montés qu'à ce moment-là, cf. LieuMap).
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(2.6)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "light-leak": "light-leak 1.4s ease 1.7s forwards",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}