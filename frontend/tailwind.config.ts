import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-kufi)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'serif'],
      },
      colors: {
        // Albaheth brand greens (design-tokens.json)
        primary: {
          50: '#F4F9F6',
          100: '#DFEEE5',
          200: '#C2DECD',
          300: '#9CC7AF',
          400: '#5F9E7E',
          500: '#2E7D4F', // green600
          600: '#1F6A40', // green700
          700: '#0B4B2A', // green900 — main action color
          800: '#093F22',
          900: '#062B18', // green950
          950: '#041D10',
        },
        // Green-tinted neutrals (brand: ink #17231C, muted #65756B, line #DBE5DE)
        ink: {
          50: '#F5F7F5',
          100: '#E9EEEA',
          200: '#D6DED8',
          300: '#B4C0B8',
          400: '#8A978E',
          500: '#65756B',
          600: '#4E5B53',
          700: '#3A463E',
          800: '#26302A',
          900: '#17231C',
          950: '#0D1510',
        },
        // Warm sand accent (brand: #F4F1E8)
        sand: {
          50: '#FBF9F3',
          100: '#F4F1E8',
          200: '#EAE4D3',
          300: '#D9D0B9',
          500: '#B3A985',
          600: '#8F8562',
          700: '#6E6449',
          800: '#514A36',
          900: '#37321F',
        },
        gold: {
          50: '#FBF9F3',
          100: '#F4F1E8',
          200: '#EAE4D3',
          300: '#D9D0B9',
          500: '#B3A985',
          600: '#8F8562',
          700: '#6E6449',
          800: '#514A36',
          900: '#37321F',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(23 35 28 / 0.04), 0 1px 3px 0 rgb(23 35 28 / 0.05)',
        'card-hover': '0 8px 30px rgb(6 43 24 / 0.08), 0 2px 6px -2px rgb(6 43 24 / 0.05)',
        brand: '0 20px 60px rgba(6, 43, 24, 0.10)',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
};

export default config;
