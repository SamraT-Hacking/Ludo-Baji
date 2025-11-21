import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { unregisterAllServiceWorkers } from './utils/cacheBuster';

// Import styles in correct order
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/game.css';
import './styles/admin.css';

// Immediately unregister any service workers to prevent stale caching issues
unregisterAllServiceWorkers();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
