import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-naskh)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'serif'],
      },
      colors: {
        primary: {
          50: '#e8f5ef',
          100: '#c8e6d5',
          200: '#a4d0b8',
          300: '#7eb89b',
          400: '#5a9c7e',
          500: '#3a8462',
          600: '#147A4D',
          700: '#126841',
          800: '#0f5636',
          900: '#0c442b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
