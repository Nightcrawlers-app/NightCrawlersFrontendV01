/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Night Crawlers brand colors
        'night-red': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626', // Primary red
          700: '#b91c1c', // Dark red
          800: '#991b1b',
          900: '#7f1d1d',
        },
        'night-green': {
          50: '#f0f8f5',
          100: '#d9ede5',
          200: '#b2dbcb',
          300: '#8cc9b1',
          400: '#59b18e',
          500: '#26996b',
          600: '#008751', // Primary green
          700: '#006c41', // Dark green
          800: '#005835',
          900: '#004428',
},
        'night-dark': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937', // Text dark
          900: '#111827',
        },
        'night-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af', // Text gray
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        'night-script': ['Playfair Display', 'serif'],
        'night-sans': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
};