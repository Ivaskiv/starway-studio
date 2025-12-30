// packages/frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
'./index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    ],
  theme: {
    extend: {
      colors: {
        // Constructor theme (темний з яскравими акцентами)
        constructor: {
          bg: '#0a0a0f',
          'bg-secondary': '#16161d',
          card: 'rgba(26, 26, 46, 0.6)',
          orange: '#f97316',
          green: '#22c55e',
          olive: '#84cc16',
          blue: '#3b82f6',
          purple: '#a855f7',
          text: '#ffffff',
          'text-muted': '#94a3b8',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        
        // User themes (для воронок)
        'theme-nadya': {
          bg: '#000747',
          'bg-secondary': '#0a0e2e',
          card: 'rgba(10, 14, 46, 0.7)',
          primary: '#3b82f6',
          secondary: '#60a5fa',
          accent: '#93c5fd',
          text: '#ffffff',
          'text-muted': '#94a3b8',
          border: 'rgba(59, 130, 246, 0.2)',
        },
        
        'theme-emerald': {
          bg: '#002015',
          'bg-secondary': '#00301f',
          card: 'rgba(0, 48, 31, 0.7)',
          primary: '#10b981',
          secondary: '#34d399',
          accent: '#6ee7b7',
          text: '#ffffff',
          'text-muted': '#94a3b8',
          border: 'rgba(16, 185, 129, 0.2)',
        },
        
        'theme-rose': {
          bg: '#200010',
          'bg-secondary': '#300020',
          card: 'rgba(48, 0, 32, 0.7)',
          primary: '#f43f5e',
          secondary: '#fb7185',
          accent: '#fda4af',
          text: '#ffffff',
          'text-muted': '#fecdd3',
          border: 'rgba(244, 63, 94, 0.2)',
        },
        
        'theme-amber': {
          bg: '#1a1000',
          'bg-secondary': '#2d1a00',
          card: 'rgba(45, 26, 0, 0.7)',
          primary: '#f59e0b',
          secondary: '#fbbf24',
          accent: '#fcd34d',
          text: '#ffffff',
          'text-muted': '#fef3c7',
          border: 'rgba(245, 158, 11, 0.2)',
        },
        
        'theme-violet': {
          bg: '#1a0033',
          'bg-secondary': '#2d0052',
          card: 'rgba(45, 0, 82, 0.7)',
          primary: '#a855f7',
          secondary: '#c084fc',
          accent: '#e9d5ff',
          text: '#ffffff',
          'text-muted': '#f3e8ff',
          border: 'rgba(168, 85, 247, 0.2)',
        },
      },
      
      // Glassmorphism
      backdropBlur: {
        xs: '2px',
      },
      
      // Animations
      keyframes: {
        'shimmer': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}