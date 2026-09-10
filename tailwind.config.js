/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#c8ff00',
          'lime-light': '#dcff47',
          'lime-dark': '#a1d400',
          'lime-glow': 'rgba(200, 255, 0, 0.25)',
          dark: '#0a0d0b',
          card: '#121714',
          'card-hover': '#18201b',
          border: '#243328',
          'border-light': '#324a38',
          cream: '#f4f3ea',
          'cream-border': '#d8d7cc',
          'cream-text': '#142018',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'lime-glow': '0 0 25px rgba(200, 255, 0, 0.35)',
        'lime-sm': '0 0 12px rgba(200, 255, 0, 0.25)',
      },
      backgroundImage: {
        'tech-grid': 'radial-gradient(circle, rgba(200,255,0,0.06) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
