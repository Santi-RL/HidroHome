/**
 * Tests manuales para los selectors del store.
 * 
 * Para ejecutar estos tests:
 * 1. Abre la aplicación en el navegador
 * 2. Abre la consola del navegador (F12)
 * 3. Ejecuta: window.testSelectors()
 * 
 * NOTA: Los hooks de React solo funcionan dentro de componentes.
 * Estos tests verifican la lógica del store directamente.
 */

import { useEditorStore } from '../../state/editorStore';
import type { SimulationResults } from '../../types/hydro';

// Crear datos de prueba
function createMockSimulationResults(): SimulationResults {
  const timesteps = [];
  for (let i = 0; i < 5; i++) {
    timesteps.push({
      time: i * 300,
      nodes: [
        {
          id: 'node1',
          label: `Node 1 @ t=${i}`,
          pressure: 50 + i * 5,
          demand: 1,
          head: 60,
          tankLevel: i > 0 ? 2 + i * 0.5 : undefined,
        },
      ],
      links: [
        {
          id: 'link1',
          label: `Link 1 @ t=${i}`,
          flow: 2 + i * 0.5,
          velocity: 1.5 + i * 0.2,
          status: 'OPEN' as const,
          headloss: 0.5,
        },
      ],
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    duration: 1200,
    reportStep: 300,
    summary: { maxPressure: 70, minPressure: 50, maxFlow: 4 },
    ranges: {
      pressure: { min: 50, max: 70 },
      flow: { min: 2, max: 4 },
      velocity: { min: 1.5, max: 2.3 },
      tankLevel: { min: 2, max: 4 },
    },
    timesteps,
    nodes: timesteps[timesteps.length - 1].nodes,
    links: timesteps[timesteps.length - 1].links,
  };
}

// Test 1: getCurrentTimestep selector
export function testGetCurrentTimestep() {
  console.group('Test 1: getCurrentTimestep selector');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  // Sin resultados, debería devolver null
  store.resetSimulation();
  let state = useEditorStore.getState().simulation;
  let currentTimestep = state.results?.timesteps[state.currentTimestepIndex] || null;
  
  console.assert(
    currentTimestep === null,
    '❌ Sin resultados debería devolver null',
  );

  // Con resultados, debería devolver el timestep actual
  store.setSimulationResults(mockResults);
  state = useEditorStore.getState().simulation;
  currentTimestep = state.results?.timesteps[state.currentTimestepIndex] || null;
  
  console.assert(
    currentTimestep !== null,
    '❌ Con resultados no debería ser null',
  );
  console.assert(
    currentTimestep?.time === 0,
    '❌ Primer timestep debería tener time=0',
  );
  console.assert(
    currentTimestep?.nodes[0].label === 'Node 1 @ t=0',
    '❌ Label del nodo incorrecto',
  );

  // Cambiar timestep
  store.setCurrentTimestep(2);
  state = useEditorStore.getState().simulation;
  currentTimestep = state.results?.timesteps[state.currentTimestepIndex] || null;
  
  console.assert(
    currentTimestep?.time === 600,
    '❌ Timestep 2 debería tener time=600',
  );
  console.assert(
    currentTimestep?.nodes[0].pressure === 60,
    '❌ Presión en timestep 2 debería ser 60',
  );

  console.log('✅ Test 1 pasado: getCurrentTimestep selector funciona correctamente');
  console.log('Timestep actual:', currentTimestep);

  console.groupEnd();
}

// Test 2: getSimulationRanges selector
export function testGetSimulationRanges() {
  console.group('Test 2: getSimulationRanges selector');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  // Sin resultados, debería devolver undefined
  store.resetSimulation();
  let state = useEditorStore.getState().simulation;
  let ranges = state.results?.ranges;
  
  console.assert(
    ranges === undefined,
    '❌ Sin resultados debería devolver undefined',
  );

  // Con resultados, debería devolver los rangos
  store.setSimulationResults(mockResults);
  state = useEditorStore.getState().simulation;
  ranges = state.results?.ranges;
  
  console.assert(ranges !== undefined, '❌ Con resultados no debería ser undefined');
  console.assert(
    ranges?.pressure.min === 50,
    '❌ Presión mínima debería ser 50',
  );
  console.assert(
    ranges?.pressure.max === 70,
    '❌ Presión máxima debería ser 70',
  );
  console.assert(
    ranges?.flow.min === 2,
    '❌ Flujo mínimo debería ser 2',
  );
  console.assert(
    ranges?.flow.max === 4,
    '❌ Flujo máximo debería ser 4',
  );
  console.assert(
    ranges?.tankLevel?.min === 2,
    '❌ Nivel de tanque mínimo debería ser 2',
  );
  console.assert(
    ranges?.tankLevel?.max === 4,
    '❌ Nivel de tanque máximo debería ser 4',
  );

  console.log('✅ Test 2 pasado: getSimulationRanges selector funciona correctamente');
  console.log('Rangos:', ranges);

  console.groupEnd();
}

// Test 3: getPlaybackControls selector
export function testGetPlaybackControls() {
  console.group('Test 3: getPlaybackControls selector');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Verificar valores iniciales
  let state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 0,
    '❌ Índice inicial debería ser 0',
  );
  console.assert(
    state.isPlaying === false,
    '❌ No debería estar reproduciéndose',
  );
  console.assert(
    state.playbackSpeed === 1.0,
    '❌ Velocidad inicial debería ser 1.0',
  );
  console.assert(
    state.results?.timesteps.length === 5,
    '❌ Total de timesteps debería ser 5',
  );

  // Usar las acciones
  store.setCurrentTimestep(3);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.currentTimestepIndex === 3,
    '❌ Índice debería ser 3 después de setCurrentTimestep',
  );

  store.togglePlayback();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.isPlaying === true,
    '❌ Debería estar reproduciéndose después de toggle',
  );

  store.setPlaybackSpeed(2.5);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 2.5,
    '❌ Velocidad debería ser 2.5',
  );

  console.log('✅ Test 3 pasado: getPlaybackControls selector funciona correctamente');
  console.log('Estado:', state);

  console.groupEnd();
}

// Test 4: Reactividad del store
export function testStoreReactivity() {
  console.group('Test 4: Reactividad del store');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Verificar que el store refleja cambios inmediatamente
  store.setCurrentTimestep(1);
  let state = useEditorStore.getState().simulation;
  let currentTimestep = state.results?.timesteps[state.currentTimestepIndex];

  console.assert(
    currentTimestep?.time === 300,
    '❌ Store debería reflejar nuevo timestep',
  );
  console.assert(
    state.currentTimestepIndex === 1,
    '❌ Store debería reflejar nuevo índice',
  );

  store.setPlaybackSpeed(3.0);
  state = useEditorStore.getState().simulation;
  console.assert(
    state.playbackSpeed === 3.0,
    '❌ Store debería reflejar nueva velocidad',
  );

  store.togglePlayback();
  state = useEditorStore.getState().simulation;
  console.assert(
    state.isPlaying === true,
    '❌ Store debería reflejar estado de reproducción',
  );

  console.log('✅ Test 4 pasado: Store es reactivo a cambios');

  console.groupEnd();
}

// Test 5: Comportamiento con datos vacíos
export function testEmptyDataBehavior() {
  console.group('Test 5: Comportamiento con datos vacíos');

  const store = useEditorStore.getState();

  // Crear resultados vacíos (sin timesteps)
  const emptyResults: SimulationResults = {
    generatedAt: new Date().toISOString(),
    duration: 0,
    reportStep: 300,
    summary: { maxPressure: 0, minPressure: 0, maxFlow: 0 },
    ranges: {
      pressure: { min: 0, max: 0 },
      flow: { min: 0, max: 0 },
      velocity: { min: 0, max: 0 },
    },
    timesteps: [],
    nodes: [],
    links: [],
  };

  store.setSimulationResults(emptyResults);

  const state = useEditorStore.getState().simulation;
  const currentTimestep = state.results?.timesteps[state.currentTimestepIndex];

  console.assert(
    currentTimestep === undefined,
    '❌ Con timesteps vacíos debería devolver undefined',
  );
  console.assert(
    state.results?.timesteps.length === 0,
    '❌ Total de timesteps debería ser 0',
  );

  console.log('✅ Test 5 pasado: Manejo correcto de datos vacíos');

  console.groupEnd();
}

// Test 6: Progreso de la simulación
export function testSimulationProgress() {
  console.group('Test 6: Calcular progreso de simulación');

  const store = useEditorStore.getState();
  const mockResults = createMockSimulationResults();

  store.setSimulationResults(mockResults);

  // Función auxiliar para calcular progreso
  function calculateProgress(): number {
    const state = useEditorStore.getState().simulation;
    const totalTimesteps = state.results?.timesteps.length || 0;
    if (totalTimesteps === 0) return 0;
    return (state.currentTimestepIndex / (totalTimesteps - 1)) * 100;
  }

  store.setCurrentTimestep(0);
  let progress = calculateProgress();
  console.assert(
    progress === 0,
    '❌ Progreso al inicio debería ser 0%',
  );

  store.setCurrentTimestep(2);
  progress = calculateProgress();
  console.assert(
    Math.abs(progress - 50) < 0.1,
    '❌ Progreso en la mitad debería ser ~50%',
  );

  store.setCurrentTimestep(4);
  progress = calculateProgress();
  console.assert(
    progress === 100,
    '❌ Progreso al final debería ser 100%',
  );

  console.log('✅ Test 6 pasado: Cálculo de progreso correcto');
  console.log('Progreso final:', progress);

  console.groupEnd();
}

// Ejecutar todos los tests
export function runAllSelectorsTests() {
  console.clear();
  console.log('🧪 Ejecutando tests de selectors del store...\n');

  try {
    testGetCurrentTimestep();
    testGetSimulationRanges();
    testGetPlaybackControls();
    testStoreReactivity();
    testEmptyDataBehavior();
    testSimulationProgress();

    console.log('\n✅ Todos los tests de selectors pasaron correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
}

// Exponer globalmente
if (typeof window !== 'undefined') {
  (window as any).testSelectors = runAllSelectorsTests;
  (window as any).testGetCurrentTimestep = testGetCurrentTimestep;
  (window as any).testGetSimulationRanges = testGetSimulationRanges;
  (window as any).testGetPlaybackControls = testGetPlaybackControls;
}

console.info(`
📋 Para ejecutar los tests de selectors desde la consola del navegador:

   window.testSelectors()

O ejecuta tests individuales:
   - testGetCurrentTimestep()
   - testGetSimulationRanges()
   - testGetPlaybackControls()
   - testStoreReactivity()
   - testEmptyDataBehavior()
   - testSimulationProgress()
`);
