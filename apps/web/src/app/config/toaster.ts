// frontend/src/app/config/toaster.ts
export const TOASTER_CONFIG = {
  position: 'top-right' as const,
  toastOptions: {
    className: 'rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-[color:var(--text-primary)] shadow-[0_10px_28px_rgba(0,0,0,0.24)]',
    success: {
      iconTheme: { primary: 'rgb(var(--accent-rgb))', secondary: 'var(--on-accent)' },
    },
    error: {
      iconTheme: { primary: '#ef4444', secondary: 'var(--on-accent)' },
    },
  },
};
