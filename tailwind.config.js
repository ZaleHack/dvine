/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b'
        },
        brand: {
          50: '#ebf5ff',
          100: '#d7eaff',
          200: '#b6d5ff',
          300: '#8bbaff',
          400: '#5997f6',
          500: '#3a7cd9',
          600: '#2b60b5',
          700: '#234d90',
          800: '#1f3f73',
          900: '#1b355f',
          950: '#12213f'
        }
      }
    },
  },
  plugins: [],
};
