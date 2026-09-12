import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cursi: {
          50: '#f0f4ff',
          100: '#dde8ff',
          200: '#c3d4ff',
          300: '#9ab4ff',
          400: '#6b8bff',
          500: '#4361ee',
          600: '#2d45d4',
          700: '#2334ac',
          800: '#212e8b',
          900: '#1f2b6e',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        panel: '0 25px 60px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
