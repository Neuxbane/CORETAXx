
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { EmbeddedRoot } from './embedded';
import './index.css';

const embeddedRoot = document.getElementById('coretax-embedded-root');

if (embeddedRoot) {
  createRoot(embeddedRoot).render(
    <React.StrictMode>
      <EmbeddedRoot />
    </React.StrictMode>
  );
} else {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
  
