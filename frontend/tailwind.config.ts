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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7dc7fc',
          400: '#36a8f7',
          500: '#0c8ee8',
          600: '#0070c6',
          700: '#0259a1',
          800: '#064c85',
          900: '#0b406e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
