import React from 'react';
import { createRoot } from 'react-dom/client';

import { SidecarApp } from './SidecarApp';
import './sidecar.css';

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
