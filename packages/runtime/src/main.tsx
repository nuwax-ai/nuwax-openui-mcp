import React from 'react';
import { createRoot } from 'react-dom/client';

import '@openuidev/react-ui/index.css';

import { RuntimeApp } from './RuntimeApp';
import { configureOpenUiValidation } from './openUiValidation';
import './sidecar.css';

configureOpenUiValidation();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing OpenUI runtime root.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <RuntimeApp />
  </React.StrictMode>,
);
