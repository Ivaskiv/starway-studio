// packages/ai-mentor/tailwind.config.js (якщо окремий)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ai-mentor': {
          primary: '#8b5cf6', // violet
          secondary: '#06b6d4', // cyan
          accent: '#f59e0b', // amber
          bg: '#0f172a', // slate-900
          surface: '#1e293b', // slate-800
        }
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)', // для iOS
      }
    },
  },
  plugins: [],
}