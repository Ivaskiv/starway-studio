/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Кольори
      colors: {
        'starway-orange': '#f97316',
        'starway-purple': '#a855f7',
        'starway-pink': '#ec4899',
        'starway-blue': '#3b82f6',
        'starway-dark': '#0f172a',
        'starway-gray': '#1e293b',
      },
      
      // Spacing (відступи, padding, margin)
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      
      // Fonts
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      // Breakpoints (якщо треба кастомні)
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}


//