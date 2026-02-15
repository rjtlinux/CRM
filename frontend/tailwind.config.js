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
          50: '#e8f0ff',
          100: '#d4e2ff',
          200: '#b0c9ff',
          300: '#8aafff',
          400: '#6694ff',
          500: '#4169e1',  // Buzeye Blue
          600: '#3557c7',
          700: '#2a46a3',
          800: '#1f357f',
          900: '#14245b',
        },
        accent: {
          50: '#fffbeb',
          100: '#fff7d6',
          200: '#ffeead',
          300: '#ffe485',
          400: '#ffd95c',
          500: '#fdb913',  // Buzeye Yellow/Gold
          600: '#e5a711',
          700: '#c48f0e',
          800: '#a3770c',
          900: '#825f09',
        },
      },
    },
  },
  plugins: [],
}
