/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        table: {
          dark: '#07090e',
          surface: '#0d1118',
          card: '#131822',
          border: '#1f2737',
          felt: '#0a101d',
          feltBorder: '#1c2538',
        },
        cyber: {
          purple: '#8b5cf6',
          violet: '#7c3aed',
          indigo: '#6366f1',
          cyan: '#06b6d4',
          neonPink: '#ec4899',
          amber: '#f59e0b',
        },
        gold: {
          400: '#a78bfa', // mapped to sleek cyber violet
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        ivory: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Syne', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'cyber-card': '0 8px 24px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.35)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.35)',
      },
    },
  },
  plugins: [],
}
