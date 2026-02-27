// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
// import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast';

import App from './App';
import { store } from './app/store';
import { TOASTER_CONFIG } from './shared/config/toaster';
import { applyAccentColor, loadAccentColor } from './shared/utils/accent.utils';
import './styles/index.scss';

// ==================== Google Client ID ====================
// const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
// if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not defined in .env')

// ==================== Render App ====================
// fix_code_x: apply persisted accent color before first paint to avoid "unstyled orange flash".
applyAccentColor(loadAccentColor());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <GoogleOAuthProvider clientId={clientId}> */}
    <Provider store={store}>
      <Toaster {...TOASTER_CONFIG} />
      <App />
    </Provider>
    {/* </GoogleOAuthProvider> */}
  </React.StrictMode>,
);
