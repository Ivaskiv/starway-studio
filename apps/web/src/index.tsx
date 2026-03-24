// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
// import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast';

import { initTheme } from '@/theme/accent.utils';
import App from './App';
import { store } from './app/store';
import { TOASTER_CONFIG } from './app/config/toaster';
import { enableMiniAppDevReload } from './dev/enableMiniAppDevReload';
import './styles/index.scss';
import { ThemeProvider } from './theme/ThemeProvider';

// ==================== Google Client ID ====================
// const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
// if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not defined in .env')

// ==================== Render App ====================

initTheme()
enableMiniAppDevReload()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <Toaster {...TOASTER_CONFIG} />
          <App />
        </ThemeProvider>
      </Provider>
    </React.StrictMode>,
);
