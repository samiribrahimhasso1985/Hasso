module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { navy: 'rgb(var(--c-navy) / <alpha-value>)', ink: 'rgb(var(--c-ink) / <alpha-value>)', gold: 'rgb(var(--c-gold) / <alpha-value>)', warm: 'rgb(var(--c-warm) / <alpha-value>)', ok: 'rgb(var(--c-ok) / <alpha-value>)', danger: 'rgb(var(--c-danger) / <alpha-value>)' },
    fontFamily: { sans: ['Cairo', 'sans-serif'], serif: ['Amiri', 'serif'] },
  } },
  plugins: [],
}
