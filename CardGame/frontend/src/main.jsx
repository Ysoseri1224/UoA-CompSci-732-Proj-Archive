import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import useAuthStore from './store/authStore.js';
import './index.css';

// Restore auth state from localStorage before the first render.
// This ensures PrivateRoute reads the correct isAuthenticated value
// synchronously on mount, preventing a flash-redirect to /login for
// users who are already logged in.
useAuthStore.getState().restoreAuth();


// Mount the React application into the #root element defined in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
