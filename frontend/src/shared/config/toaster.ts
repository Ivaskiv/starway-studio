// frontend/src/shared/config/toaster.ts
export const TOASTER_CONFIG = {
  position: 'top-right' as const,
  toastOptions: {
    style: {
      background: 'rgba(15, 15, 15, 0.9)',
      color: '#fff',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
    },
    success: {
      iconTheme: { primary: '#f97316', secondary: '#fff' },
    },
    error: {
      iconTheme: { primary: '#ef4444', secondary: '#fff' },
    },
  },
};