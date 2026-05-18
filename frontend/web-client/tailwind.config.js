/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'steam-dark': '#0f1724', // Slightly deeper, modern dark
        'steam-panel': '#1b2838',
        'steam-panel-light': '#2a475e',
        'steam-blue': '#66c0f4',
        'steam-blue-light': '#8ed2f8',
        'steam-green': '#a4d007',
        'steam-green-dark': '#4c6b22',
        'steam-text': '#c6d4df',
        'steam-muted': '#8f98a0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Modern clean typography
      },
      backgroundImage: {
        'steam-gradient': 'radial-gradient(circle at top center, #2a475e 0%, #0f1724 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 15px rgba(102, 192, 244, 0.3)',
      }
    },
  },
  plugins: [],
}

