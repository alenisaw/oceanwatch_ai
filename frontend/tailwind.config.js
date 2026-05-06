/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#010E1C',
          900: '#071422',
          850: '#0A1A2E',
          800: '#0D1D35',
          750: '#112240',
          700: '#162B50',
          600: '#1E3A5F',
          500: '#27496D',
        },
        cyan: {
          glow: '#67E8F9',
          bright: '#22D3EE',
          mid: '#0EA5E9',
          dim: '#0891B2',
          dark: '#065F78',
        },
        risk: {
          none: '#22C55E',
          low: '#84CC16',
          medium: '#F59E0B',
          high: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        ocean: '0 0 0 1px rgba(34,211,238,0.08), 0 4px 24px rgba(1,14,28,0.7)',
        'cyan-glow': '0 0 14px rgba(34,211,238,0.25)',
        panel: '0 0 0 1px rgba(22,43,80,0.9), 0 2px 8px rgba(1,14,28,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-dim': 'pulseDim 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDim: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
