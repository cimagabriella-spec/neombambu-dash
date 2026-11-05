/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--nb-${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        graphite: v('graphite'),
        paper: v('paper'),
        sand: v('sand'),
        wood: v('wood'),
        olive: v('olive'),
        mineral: v('mineral'),
        line: v('line'),
        muted: v('muted'),
        st: {
          ideia: v('st-ideia'),
          producao: v('st-producao'),
          revisao: v('st-revisao'),
          aguardando: v('st-aguardando'),
          ajustes: v('st-ajustes'),
          aprovado: v('st-aprovado'),
          programado: v('st-programado'),
          publicado: v('st-publicado'),
        },
      },
      fontFamily: {
        display: ['Manrope', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      letterSpacing: { brand: '0.32em', label: '0.14em' },
      borderRadius: { xs: '2px' },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .35s cubic-bezier(.2,.7,.2,1) both',
        'slide-in': 'slide-in .3s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
}
