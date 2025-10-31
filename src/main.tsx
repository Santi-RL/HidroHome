import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/global.css';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';
import { cleanLegacySimulationData } from './shared/utils/simulationMigration';

// Migrar datos de simulación antiguos antes de renderizar
cleanLegacySimulationData();

// Cargar tests en modo desarrollo
if (import.meta.env.DEV) {
  import('./shared/utils/__tests__/index').then(() => {
    console.log('✅ Tests manuales cargados. Ejecuta showTestHelp() para ver comandos.');
  });
}

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
