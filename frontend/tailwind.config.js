/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // class stratejisi ile dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6', 
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        }
      },
      backgroundColor: {
        'dark': '#0f172a', // slate-900
        'light': '#f8fafc', // slate-50
      },
      textColor: {
        'dark': '#f8fafc', // slate-50
        'light': '#0f172a', // slate-900
      }
    },
  },
  plugins: [],
} 