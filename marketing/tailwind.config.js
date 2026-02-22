/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#e0eaff',
          200: '#c7d9fe',
          400: '#6b8fef',
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
