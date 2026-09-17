import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plex)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'serif'],
      },
      colors: {
        primary: {
          50: '#eef6f1',
          100: '#d5e9dc',
          200: '#abd7ba',
          300: '#7dc098',
          400: '#4fa276',
          500: '#2d875a',
          600: '#147A4D',
          700: '#116340',
          800: '#0e4c33',
          900: '#0a3b27',
          950: '#052418',
        },
        ink: {
          50: '#f4f6f9',
          100: '#e6eaf1',
          200: '#c9d2e0',
          300: '#a3b1c9',
          400: '#75849f',
          500: '#56637b',
          600: '#414c61',
          700: '#333c4e',
          800: '#232b3a',
          900: '#151b27',
          950: '#0c111b',
        },
        gold: {
          50: '#fbf8ef',
          100: '#f4ecd4',
          200: '#e8d7a6',
          300: '#dabc6f',
          400: '#c9a04a',
          500: '#b08d3e',
          600: '#96742f',
          700: '#7a5b28',
          800: '#5f4623',
          900: '#4a361f',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(21 27 39 / 0.04), 0 1px 3px 0 rgb(21 27 39 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(21 27 39 / 0.10), 0 2px 4px -2px rgb(21 27 39 / 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
