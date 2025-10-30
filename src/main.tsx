import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/global.css';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';

const container = document.getElementById('app');

if (!container) {
  throw new Error("Contenedor principal '#app' no encontrado");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
