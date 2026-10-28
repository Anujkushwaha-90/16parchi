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
          dark: '#080c0e',
          surface: '#11171d',
          card: '#161f26',
          border: '#24323d',
          felt: '#0b2b20',
          feltBorder: '#144634',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        },
        emerald: {
          850: '#064230',
          950: '#02241a',
        },
        ivory: {
          50: '#ffffff',
          100: '#fdfbf7',
          200: '#f7f4ec',
          300: '#ede8dc',
          400: '#dcd4c3',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cinzel', 'Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'table': 'inset 0 0 80px rgba(0, 0, 0, 0.8), 0 20px 50px rgba(0, 0, 0, 0.9)',
        'gold-glow': '0 0 25px rgba(245, 158, 11, 0.35)',
        'emerald-glow': '0 0 25px rgba(16, 185, 129, 0.35)',
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 20px 30px -10px rgba(245, 158, 11, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        passClockwise: {
          '0%': { transform: 'scale(1) translateY(0)', opacity: '1' },
          '50%': { transform: 'scale(1.15) translateY(-30px)', opacity: '0.9' },
          '100%': { transform: 'scale(0.8) translateY(-80px)', opacity: '0' },
        }
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite linear',
        pulseGlow: 'pulseGlow 2s infinite ease-in-out',
        cardFlip: 'cardFlip 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }
    },
  },
  plugins: [],
}
