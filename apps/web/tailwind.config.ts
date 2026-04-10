import plugin from 'tailwindcss/plugin';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--accent-rgb)/<alpha-value>)',
          soft: 'rgba(var(--accent-soft-rgb)/<alpha-value>)',
          strong: 'rgba(var(--accent-strong-rgb)/<alpha-value>)',
        },
        accent: 'rgb(var(--accent-rgb)/<alpha-value>)',
        bg: {
          DEFAULT: 'rgb(var(--ambient-rgb)/<alpha-value>)',
          soft: 'rgb(var(--ambient-rgb-2)/<alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--icon-rgb)/<alpha-value>)',
        },
        glass: 'rgba(255,255,255,0.08)',
        adminSidebar: {
          bg: 'var(--admin-sidebar-bg)',
          border: 'var(--admin-sidebar-border)',
          textMuted: 'var(--admin-sidebar-text-muted)',
          textSecondary: 'var(--admin-sidebar-text-secondary)',
          textPrimary: 'var(--admin-sidebar-text-primary)',
          itemHover: 'var(--admin-sidebar-item-hover)',
          itemActive: 'var(--admin-sidebar-item-active)',
          accentBorder: 'var(--admin-sidebar-accent-border)',
        },
      },
      fontFamily: {
        display: ['Inter','system-ui','sans-serif'],
        body: ['Inter','system-ui','sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        glass: 'var(--glass-blur)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* IE 10+ / Edge */
          '-ms-overflow-style': 'none',
        },
        '.scrollbar-none::-webkit-scrollbar': {
          display: 'none', /* Chrome, Safari, Opera */
        },
      })
    })
  ],
};

export default config;
