export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07090b', 900: '#0b0f12', 800: '#12181d', 700: '#1a2228', 600: '#25313a' },
        aqua: { 300: '#7ff3ea', 400: '#3ee6dc', 500: '#14d3c8', 600: '#0fb1a8' },
        cyanx: { 400: '#38d9ff', 500: '#12c2f0' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { glow: '0 0 24px rgba(20,211,200,.35)' },
    },
  },
  plugins: [],
};
