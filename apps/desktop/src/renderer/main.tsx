import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Renderer root element was not found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
