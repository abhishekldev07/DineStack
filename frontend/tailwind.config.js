/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        loaderBreath: {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.92',
          },
          '50%': {
            transform: 'scale(1.035)',
            opacity: '1',
          },
        },
        loaderGlow: {
          '0%, 100%': {
            opacity: '0.58',
            transform: 'scale(0.96)',
          },
          '50%': {
            opacity: '0.92',
            transform: 'scale(1.04)',
          },
        },
        loaderShimmer: {
          '0%': {
            transform: 'translateX(-120%)',
          },
          '100%': {
            transform: 'translateX(120%)',
          },
        },
        loaderDot: {
          '0%, 80%, 100%': {
            opacity: '0.25',
            transform: 'translateY(0)',
          },
          '40%': {
            opacity: '1',
            transform: 'translateY(-3px)',
          },
        },
      },
      animation: {
        'loader-breath': 'loaderBreath 3.8s ease-in-out infinite',
        'loader-glow': 'loaderGlow 4.6s ease-in-out infinite',
        'loader-shimmer': 'loaderShimmer 1.8s linear infinite',
        'loader-dot': 'loaderDot 1.4s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      colors: {
        brand: {
          50: '#fff8ed',
          100: '#fff1d6',
          200: '#ffe1a8',
          300: '#ffd07a',
          400: '#ffc04c',
          DEFAULT: '#f59e0b',
          600: '#d77a04',
          700: '#a85703',
          800: '#7a3802',
          900: '#4d1f01'
        },
        bg: {
          dark: '#020617',
          deep: '#0f172a',
          panel: '#111827'
        }
      },
      boxShadow: {
        premium: '0 20px 50px rgba(2,6,23,0.6)',
        'premium-soft': '0 8px 30px rgba(2,6,23,0.45)'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    },
  },
  plugins: [],
}