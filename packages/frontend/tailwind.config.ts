import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Глобальні змінні
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',

        // Constructor theme (чорний фон + яскраві акценти)
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

        // User themes
        'theme-blue': {
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
        glass: '20px',
      },

      // Анімації
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 30px var(--color-accent)' },
          '50%': { boxShadow: '0 0 50px var(--color-accent)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
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
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
