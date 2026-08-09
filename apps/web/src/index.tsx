// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
// import { GoogleOAuthProvider } from '@react-oauth/google'

import { initTheme } from '@/theme/accent.utils';
import { AppToaster } from '@/shared/Toast';
import App from './App';
import { store } from './app/store';
import { enableMiniAppDevReload } from './dev/enableMiniAppDevReload';
import './styles/index.scss';
import { ThemeProvider } from './theme/ThemeProvider';

// ==================== Google Client ID ====================
// const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
// if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not defined in .env')

// ==================== Render App ====================

initTheme()
enableMiniAppDevReload()


if (import.meta.env.DEV) {
  const renderRuntimeError = (title: string, detail: unknown) => {
    const message =
      detail instanceof Error
        ? `${detail.message}\n${detail.stack ?? ''}`
        : String(detail ?? '')

    console.error(`[TELEGRAM_WEBVIEW_DEBUG] ${title}`, detail)

    const existing = document.getElementById('telegram-webview-debug')
    const node = existing ?? document.createElement('pre')

    node.id = 'telegram-webview-debug'
    node.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'margin:0',
      'padding:16px',
      'overflow:auto',
      'white-space:pre-wrap',
      'background:#111827',
      'color:#fca5a5',
      'font:13px/1.5 monospace',
    ].join(';')

    node.textContent = `${title}\n\n${message}`

    if (!existing) {
      document.documentElement.appendChild(node)
    }
  }

  window.addEventListener('error', event => {
    renderRuntimeError(
      'WINDOW ERROR',
      event.error ??
        `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`,
    )
  })

  window.addEventListener('unhandledrejection', event => {
    renderRuntimeError('UNHANDLED PROMISE REJECTION', event.reason)
  })
}


if (import.meta.env.DEV) {
  const bootProbe = document.createElement('div')
  bootProbe.id = 'telegram-module-boot-probe'
  bootProbe.textContent = 'MODULE BOOT OK'
  bootProbe.style.cssText = [
    'position:fixed',
    'top:64px',
    'left:12px',
    'right:12px',
    'z-index:2147483647',
    'padding:14px',
    'background:#14532d',
    'color:#fff',
    'font:700 16px/1.4 system-ui',
    'border-radius:8px',
  ].join(';')
  document.documentElement.appendChild(bootProbe)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <AppToaster />
          <App />
        </ThemeProvider>
      </Provider>
    </React.StrictMode>,
);
