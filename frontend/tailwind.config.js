/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        electric: '#0638C9',
        midnight: '#082B91',
        royal: '#064DE0',
        lime: {
          neon: '#B7FF00',
          fresh: '#9EF000',
          DEFAULT: '#B7FF00',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          off: '#F5F5F2',
        },
        ink: {
          DEFAULT: '#111111',
          secondary: '#62666F',
        },
        line: '#E8E8E8',
        brand: {
          blue: '#0638C9',
          navy: '#082B91',
          royal: '#064DE0',
          lime: '#B7FF00',
          muted: '#62666F',
          dark: '#111111',
        },
      },
      boxShadow: {
        softblue: '0 24px 70px -24px rgba(6, 56, 201, 0.28)',
        sticker: '3px 3px 0px #111111',
        'sticker-sm': '2px 2px 0px #111111',
        'glow-lime': '0 0 25px rgba(183, 255, 0, 0.45)',
        'glow-blue': '0 12px 35px -8px rgba(6, 56, 201, 0.35)',
        card: '0 8px 30px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
