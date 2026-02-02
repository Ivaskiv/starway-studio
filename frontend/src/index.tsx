// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
// import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast';

import App from './App';
import { persistor, store } from './app/store/store';
import './styles/index.scss';

// ==================== Google Client ID ====================
// const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
// if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not defined in .env')

// ==================== Render App ====================
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <GoogleOAuthProvider clientId={clientId}> */}
    <PersistGate loading={null} persistor={persistor}>
      <Provider store={store}>
        <Toaster position="top-right" />
        <App />
      </Provider>
    </PersistGate>
    {/* </GoogleOAuthProvider> */}
  </React.StrictMode>,
);
