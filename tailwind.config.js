/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de NODO: verde profundo del logo + blanco
        noche: '#042D29',   // verde del fondo del logo: texto principal, barra lateral
        cancha: {
          DEFAULT: '#0F6B57', // verde de acción: botones, links, selección
          claro: '#16876D',
          suave: '#DCEEE8',
        },
        vidrio: '#F2F6F4',  // fondo general, blanco con un toque de verde
        pelota: '#C8DC3C',  // lima (pelota): ganador / clasificado
        red: { DEFAULT: '#B42318' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Arial Narrow', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
