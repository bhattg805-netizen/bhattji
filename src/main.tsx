import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/api.ts';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
