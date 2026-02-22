/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0ff',
          500: '#4169e1',
          600: '#3557c7',
          700: '#2a46a3',
        },
        accent: {
          400: '#ffd95c',
          500: '#fdb913',
        },
      },
    },
  },
  plugins: [],
};
