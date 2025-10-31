import type { SimulationResults } from '../types/hydro';

/**
 * Clave de almacenamiento local para resultados de simulación.
 */
const AUTOSAVE_KEY = 'hidrohome_autosave_v1';
const STORE_KEY = 'hidrohome-editor-store';

/**
 * Detecta si los resultados de simulación están en el formato antiguo (sin timesteps).
 */
export function isLegacySimulationResults(
  results: SimulationResults | undefined,
): boolean {
  if (!results) return false;
  // El formato antiguo no tiene timesteps o duration
  return !results.timesteps || !results.duration;
}

/**
 * Convierte resultados del formato antiguo al nuevo formato con series temporales.
 * Crea un único timestep con los datos existentes para mantener compatibilidad.
 */
export function migrateLegacyResults(
  legacy: SimulationResults,
): SimulationResults {
  // Si ya tiene timesteps, no migrar
  if (legacy.timesteps && legacy.timesteps.length > 0) {
    return legacy;
  }

  // Crear un único timestep con los datos existentes
  const singleTimestep = {
    time: 0,
    nodes: legacy.nodes || [],
    links: legacy.links || [],
  };

  // Calcular rangos básicos
  const pressures = singleTimestep.nodes.map((n) => n.pressure);
  const flows = singleTimestep.links.map((l) => Math.abs(l.flow));
  const velocities = singleTimestep.links.map((l) => Math.abs(l.velocity));

  const ranges = {
    pressure: {
      min: pressures.length > 0 ? Math.min(...pressures) : 0,
      max: pressures.length > 0 ? Math.max(...pressures) : 0,
    },
    flow: {
      min: flows.length > 0 ? Math.min(...flows) : 0,
      max: flows.length > 0 ? Math.max(...flows) : 0,
    },
    velocity: {
      min: velocities.length > 0 ? Math.min(...velocities) : 0,
      max: velocities.length > 0 ? Math.max(...velocities) : 0,
    },
  };

  return {
    ...legacy,
    duration: 0,
    reportStep: 3600, // 1 hora por defecto
    timesteps: [singleTimestep],
    ranges,
  };
}

/**
 * Limpia resultados de simulación antiguos del localStorage.
 * Debe llamarse al iniciar la aplicación para migrar datos existentes.
 */
export function cleanLegacySimulationData(): void {
  try {
    // Limpiar el store principal
    const storeData = localStorage.getItem(STORE_KEY);
    if (storeData) {
      const parsed = JSON.parse(storeData);
      if (parsed.state?.simulation?.results) {
        const results = parsed.state.simulation.results;
        if (isLegacySimulationResults(results)) {
          console.info(
            '[Migration] Detectados resultados de simulación en formato antiguo, migrando...',
          );
          parsed.state.simulation.results = migrateLegacyResults(results);
          localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
        }
      }
    }

    // Limpiar autosave si existe
    const autosaveData = localStorage.getItem(AUTOSAVE_KEY);
    if (autosaveData) {
      const parsed = JSON.parse(autosaveData);
      if (parsed.simulation?.results && isLegacySimulationResults(parsed.simulation.results)) {
        console.info('[Migration] Migrando resultados en autosave...');
        parsed.simulation.results = migrateLegacyResults(parsed.simulation.results);
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(parsed));
      }
    }
  } catch (error) {
    console.warn('[Migration] Error al migrar datos de simulación:', error);
    // No lanzar error para no romper la aplicación
  }
}

/**
 * Valida que los resultados de simulación tengan el formato correcto.
 */
export function validateSimulationResults(
  results: SimulationResults,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!results.timesteps || !Array.isArray(results.timesteps)) {
    errors.push('Falta el array de timesteps');
  } else if (results.timesteps.length === 0) {
    errors.push('El array de timesteps está vacío');
  }

  if (typeof results.duration !== 'number' || results.duration < 0) {
    errors.push('Duración inválida');
  }

  if (typeof results.reportStep !== 'number' || results.reportStep <= 0) {
    errors.push('Intervalo de reporte inválido');
  }

  if (!results.ranges) {
    errors.push('Faltan los rangos de valores');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
