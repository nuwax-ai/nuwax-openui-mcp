import React from 'react';
import { createRoot } from 'react-dom/client';

import '@openuidev/react-ui/index.css';

import { SidecarApp } from './SidecarApp';
import { configureOpenUiValidation } from './openUiValidation';
import './sidecar.css';

configureOpenUiValidation();

const rootElement = document.getElementById('root');
const artifactId = rootElement?.dataset.artifactId;

if (!rootElement || !artifactId) {
  throw new Error('Missing sidecar root or artifact id.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <SidecarApp artifactId={artifactId} />
  </React.StrictMode>,
);
