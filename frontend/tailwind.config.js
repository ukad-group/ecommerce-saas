/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#dfe8f3',
          200: '#c5d5e9',
          300: '#9fb9da',
          400: '#7396c7',
          500: '#5579b6',
          600: '#4a6ba8',
          700: '#3d5789',
          800: '#364a70',
          900: '#303f5e',
          950: '#20283e',
        },
      },
    },
  },
  plugins: [],
}

