/**
 * Tests manuales para las acciones del store de simulación.
 * 
 * Para ejecutar estos tests:
 * 1. Abre la aplicación en el navegador
 * 2. Abre la consola del navegador (F12)
 * 3. Ejecuta: window.testStoreActions()
 */

import { useEditorStore } from '../../state/editorStore';
import type { SimulationResults } from '../../types/hydro';

// Crear datos de prueba
function createMockSimulationResults(): SimulationResults {
  const timesteps = [];
  for (let i = 0; i < 10; i++) {
    timesteps.push({
      time: i * 300, // 5 minutos entre cada timestep
      nodes: [
        {
          id: 'node1',
          label: 'Node 1',
          pressure: 50 + i * 2,
          demand: 1,
          head: 60,
        },
      ],
      links: [
        {
          id: 'link1',
          label: 'Link 1',
          flow: 2 + i * 0.1,
          velocity: 1.5,
          status: 'OPEN' as const,
          headloss: 0.5,
        },
      ],
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    duration: 3000,
    reportStep: 300,
    summary: { maxPressure: 100, minPressure: 50, maxFlow: 3 },
    ranges: {
      pressure: { min: 50, max: 68 },
      flow: { min: 2, max: 2.9 },
      velocity: { min: 1.5, max: 1.5 },
    },
    timesteps,
    nodes: timesteps[timesteps.length - 1].nodes,
    links: timesteps[timesteps.length - 1].links,
  };
}

// Test 1: Establecer resultados de simulación
export function testSetSimulationResults() {
  console.group('Test 1: Establecer resultados de simulación');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  const state = useEditorStore.getState().simulation;

  console.assert(state.status === 'success', '❌ Status debería ser success');
  console.assert(
    state.results !== undefined,
    '❌ Results no deberían ser undefined',
  );
  console.assert(
    state.currentTimestepIndex === 0,
    '❌ Debería empezar en timestep 0',
  );
  console.assert(
    state.isPlaying === false,
    '❌ No debería estar reproduciéndose',
  );
  console.assert(
    state.playbackSpeed === 1.0,
    '❌ Velocidad debería ser 1.0',
  );

  console.log('✅ Test 1 pasado: Resultados establecidos correctamente');
  console.log('Estado de simulación:', state);

  console.groupEnd();
}

// Test 2: Navegar timesteps
export function testNavigateTimesteps() {
  console.group('Test 2: Navegar entre timesteps');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Avanzar al siguiente
  store.nextTimestep();
  let state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 1,
    '❌ Debería avanzar a timestep 1',
  );

  // Avanzar varios
  store.setCurrentTimestep(5);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 5,
    '❌ Debería estar en timestep 5',
  );

  // Retroceder
  store.previousTimestep();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 4,
    '❌ Debería retroceder a timestep 4',
  );

  console.log('✅ Test 2 pasado: Navegación correcta');

  console.groupEnd();
}

// Test 3: Límites de navegación
export function testNavigationBounds() {
  console.group('Test 3: Límites de navegación');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Intentar ir más allá del límite superior
  store.setCurrentTimestep(100);
  let state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 9,
    '❌ Debería limitarse al último timestep (9)',
  );

  // Intentar ir más allá del límite inferior
  store.setCurrentTimestep(-5);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 0,
    '❌ Debería limitarse al primer timestep (0)',
  );

  // Avanzar desde el final no debería hacer nada
  store.setCurrentTimestep(9);
  store.nextTimestep();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 9,
    '❌ Debería quedarse en el último timestep',
  );

  // Retroceder desde el inicio no debería hacer nada
  store.setCurrentTimestep(0);
  store.previousTimestep();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 0,
    '❌ Debería quedarse en el primer timestep',
  );

  console.log('✅ Test 3 pasado: Límites respetados correctamente');

  console.groupEnd();
}

// Test 4: Control de reproducción
export function testPlaybackControls() {
  console.group('Test 4: Control de reproducción');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Toggle play
  store.togglePlayback();
  let state = useEditorStore.getState().simulation;
  console.assert(state.isPlaying === true, '❌ Debería estar reproduciéndose');

  // Toggle pause
  store.togglePlayback();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.isPlaying === false,
    '❌ Debería estar en pausa',
  );

  console.log('✅ Test 4 pasado: Toggle de reproducción funciona');

  console.groupEnd();
}

// Test 5: Velocidad de reproducción
export function testPlaybackSpeed() {
  console.group('Test 5: Velocidad de reproducción');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Establecer velocidad normal
  store.setPlaybackSpeed(2.0);
  let state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 2.0,
    '❌ Velocidad debería ser 2.0',
  );

  // Velocidad lenta
  store.setPlaybackSpeed(0.5);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 0.5,
    '❌ Velocidad debería ser 0.5',
  );

  // Límite inferior (no puede ser menor a 0.1)
  store.setPlaybackSpeed(0.05);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 0.1,
    '❌ Velocidad debería limitarse a 0.1',
  );

  // Límite superior (no puede ser mayor a 10.0)
  store.setPlaybackSpeed(15.0);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 10.0,
    '❌ Velocidad debería limitarse a 10.0',
  );

  console.log('✅ Test 5 pasado: Control de velocidad funciona correctamente');

  console.groupEnd();
}

// Test 6: Reset de simulación
export function testResetSimulation() {
  console.group('Test 6: Reset de simulación');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  // Establecer resultados y modificar estado
  store.setSimulationResults(mockResults);
  store.setCurrentTimestep(5);
  store.togglePlayback();
  store.setPlaybackSpeed(2.0);

  // Reset
  store.resetSimulation();
  const state = useEditorStore.getState().simulation;

  console.assert(state.status === 'idle', '❌ Status debería ser idle');
  console.assert(
    state.results === undefined,
    '❌ Results deberían ser undefined',
  );
  console.assert(
    state.currentTimestepIndex === 0,
    '❌ Timestep debería volver a 0',
  );
  console.assert(
    state.isPlaying === false,
    '❌ No debería estar reproduciéndose',
  );
  console.assert(
    state.playbackSpeed === 1.0,
    '❌ Velocidad debería volver a 1.0',
  );

  console.log('✅ Test 6 pasado: Reset funciona correctamente');

  console.groupEnd();
}

// Ejecutar todos los tests
export function runAllStoreTests() {
  console.clear();
  console.log('🧪 Ejecutando tests del store de simulación...\n');

  try {
    testSetSimulationResults();
    testNavigateTimesteps();
    testNavigationBounds();
    testPlaybackControls();
    testPlaybackSpeed();
    testResetSimulation();

    console.log('\n✅ Todos los tests del store pasaron correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
}

// Exponer globalmente para facilitar ejecución desde consola
if (typeof window !== 'undefined') {
  (window as any).testStoreActions = runAllStoreTests;
  (window as any).createMockSimulationResults = createMockSimulationResults;
}

console.info(`
📋 Para ejecutar los tests del store desde la consola del navegador:

   window.testStoreActions()

O ejecuta tests individuales:
   - testSetSimulationResults()
   - testNavigateTimesteps()
   - testNavigationBounds()
   - testPlaybackControls()
   - testPlaybackSpeed()
   - testResetSimulation()
`);
