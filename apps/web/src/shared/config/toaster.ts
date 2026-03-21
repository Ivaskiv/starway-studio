// frontend/src/shared/config/toaster.ts
export const TOASTER_CONFIG = {
  position: 'top-right' as const,
  toastOptions: {
    style: {
      background: 'rgba(var(--ambient-rgb-2),0.74)',
      color: 'var(--color-text)',
      borderRadius: '16px',
      border: '1px solid rgba(var(--glass-border-rgb),0.3)',
      boxShadow: '0 10px 28px rgba(var(--glass-shadow-rgb),0.24)',
      backdropFilter: 'blur(18px)',
    },
    success: {
      iconTheme: { primary: 'rgb(var(--accent-rgb))', secondary: 'var(--on-accent)' },
    },
    error: {
      iconTheme: { primary: '#ef4444', secondary: 'var(--on-accent)' },
    },
  },
};
