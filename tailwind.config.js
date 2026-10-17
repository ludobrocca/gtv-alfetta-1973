/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        alfa: {
          red: '#9E1B24',
          crimson: '#C8102E',
          gold: '#C5A059',
          silver: '#D4D8DD',
          charcoal: '#111113',
          graphite: '#1B1C20',
        },
      },
      boxShadow: {
        glass: '0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        'glass-light': '0 20px 50px rgba(15, 18, 24, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
    },
  },
  plugins: [],
};
