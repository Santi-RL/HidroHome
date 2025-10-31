/**
 * Tests manuales para el sistema de migración de datos de simulación.
 * 
 * Para ejecutar estos tests:
 * 1. Abre la consola del navegador (F12)
 * 2. Copia y pega las funciones de este archivo
 * 3. Ejecuta runAllMigrationTests()
 */

import {
  isLegacySimulationResults,
  migrateLegacyResults,
  validateSimulationResults,
} from '../simulationMigration';
import type { SimulationResults } from '../../types/hydro';

// Test 1: Detectar formato legacy
export function testDetectLegacyFormat() {
  console.group('Test 1: Detectar formato legacy');

  const legacyResults: any = {
    generatedAt: '2025-10-30T10:00:00Z',
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    nodes: [
      { id: 'node1', label: 'Node 1', pressure: 50, demand: 1, head: 60 },
    ],
    links: [
      {
        id: 'link1',
        label: 'Link 1',
        flow: 2,
        velocity: 1.5,
        status: 'OPEN',
        headloss: 0.5,
      },
    ],
  };

  const isLegacy = isLegacySimulationResults(legacyResults);
  console.assert(isLegacy === true, '❌ Debería detectar formato legacy');
  console.log('✅ Test 1 pasado: Formato legacy detectado correctamente');

  console.groupEnd();
}

// Test 2: Migrar datos legacy
export function testMigrateLegacyData() {
  console.group('Test 2: Migrar datos legacy');

  const legacyResults: any = {
    generatedAt: '2025-10-30T10:00:00Z',
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    nodes: [
      { id: 'node1', label: 'Node 1', pressure: 50, demand: 1, head: 60 },
      { id: 'node2', label: 'Node 2', pressure: 80, demand: 0.5, head: 90 },
    ],
    links: [
      {
        id: 'link1',
        label: 'Link 1',
        flow: 2,
        velocity: 1.5,
        status: 'OPEN',
        headloss: 0.5,
      },
    ],
  };

  const migrated = migrateLegacyResults(legacyResults);

  console.assert(
    migrated.timesteps && migrated.timesteps.length === 1,
    '❌ Debería tener 1 timestep',
  );
  console.assert(
    migrated.duration === 0,
    '❌ Duration debería ser 0 para legacy',
  );
  console.assert(
    migrated.reportStep === 3600,
    '❌ ReportStep debería ser 3600 por defecto',
  );
  console.assert(
    migrated.ranges.pressure.min === 50 && migrated.ranges.pressure.max === 80,
    '❌ Rangos de presión incorrectos',
  );
  console.assert(
    migrated.ranges.flow.min === 2 && migrated.ranges.flow.max === 2,
    '❌ Rangos de flujo incorrectos',
  );

  console.log('✅ Test 2 pasado: Migración correcta de datos legacy');
  console.log('Resultado migrado:', migrated);

  console.groupEnd();
}

// Test 3: No migrar datos ya migrados
export function testDoNotMigrateNewFormat() {
  console.group('Test 3: No re-migrar formato nuevo');

  const newResults: SimulationResults = {
    generatedAt: '2025-10-30T10:00:00Z',
    duration: 3600,
    reportStep: 300,
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    ranges: {
      pressure: { min: 20, max: 100 },
      flow: { min: 0, max: 5 },
      velocity: { min: 0, max: 2 },
    },
    timesteps: [
      {
        time: 0,
        nodes: [
          { id: 'node1', label: 'Node 1', pressure: 50, demand: 1, head: 60 },
        ],
        links: [
          {
            id: 'link1',
            label: 'Link 1',
            flow: 2,
            velocity: 1.5,
            status: 'OPEN',
            headloss: 0.5,
          },
        ],
      },
    ],
    nodes: [
      { id: 'node1', label: 'Node 1', pressure: 50, demand: 1, head: 60 },
    ],
    links: [
      {
        id: 'link1',
        label: 'Link 1',
        flow: 2,
        velocity: 1.5,
        status: 'OPEN',
        headloss: 0.5,
      },
    ],
  };

  const isLegacy = isLegacySimulationResults(newResults);
  console.assert(isLegacy === false, '❌ No debería detectar como legacy');

  const result = migrateLegacyResults(newResults);
  console.assert(
    result.timesteps.length === 1,
    '❌ Debería mantener los timesteps existentes',
  );

  console.log('✅ Test 3 pasado: No re-migra formato nuevo');

  console.groupEnd();
}

// Test 4: Validar estructura de resultados
export function testValidateResults() {
  console.group('Test 4: Validar estructura de resultados');

  const validResults: SimulationResults = {
    generatedAt: '2025-10-30T10:00:00Z',
    duration: 3600,
    reportStep: 300,
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    ranges: {
      pressure: { min: 20, max: 100 },
      flow: { min: 0, max: 5 },
      velocity: { min: 0, max: 2 },
    },
    timesteps: [
      {
        time: 0,
        nodes: [],
        links: [],
      },
    ],
    nodes: [],
    links: [],
  };

  const validation = validateSimulationResults(validResults);
  console.assert(validation.valid === true, '❌ Debería ser válido');
  console.assert(
    validation.errors.length === 0,
    '❌ No debería tener errores',
  );

  console.log('✅ Test 4 pasado: Validación correcta');

  console.groupEnd();
}

// Test 5: Detectar resultados inválidos
export function testInvalidResults() {
  console.group('Test 5: Detectar resultados inválidos');

  const invalidResults: any = {
    generatedAt: '2025-10-30T10:00:00Z',
    duration: -100, // Inválido
    reportStep: 0, // Inválido
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    // Falta ranges
    timesteps: [], // Vacío
    nodes: [],
    links: [],
  };

  const validation = validateSimulationResults(invalidResults);
  console.assert(validation.valid === false, '❌ Debería ser inválido');
  console.assert(validation.errors.length > 0, '❌ Debería tener errores');

  console.log('Errores detectados:', validation.errors);
  console.log('✅ Test 5 pasado: Detecta resultados inválidos correctamente');

  console.groupEnd();
}

// Test 6: Calcular rangos correctamente
export function testRangeCalculation() {
  console.group('Test 6: Calcular rangos correctamente');

  const legacyResults: any = {
    generatedAt: '2025-10-30T10:00:00Z',
    summary: { maxPressure: 100, minPressure: 20, maxFlow: 5 },
    nodes: [
      { id: 'node1', label: 'Node 1', pressure: 30, demand: 1, head: 60 },
      { id: 'node2', label: 'Node 2', pressure: 70, demand: 0.5, head: 90 },
      { id: 'node3', label: 'Node 3', pressure: 50, demand: 0.2, head: 80 },
    ],
    links: [
      {
        id: 'link1',
        label: 'Link 1',
        flow: 2.5,
        velocity: 1.5,
        status: 'OPEN',
        headloss: 0.5,
      },
      {
        id: 'link2',
        label: 'Link 2',
        flow: -1.2, // Flujo negativo
        velocity: 0.8,
        status: 'OPEN',
        headloss: 0.2,
      },
    ],
  };

  const migrated = migrateLegacyResults(legacyResults);

  console.assert(
    migrated.ranges.pressure.min === 30,
    '❌ Presión mínima debería ser 30',
  );
  console.assert(
    migrated.ranges.pressure.max === 70,
    '❌ Presión máxima debería ser 70',
  );
  console.assert(
    migrated.ranges.flow.min === 1.2,
    '❌ Flujo mínimo debería ser 1.2 (valor absoluto)',
  );
  console.assert(
    migrated.ranges.flow.max === 2.5,
    '❌ Flujo máximo debería ser 2.5',
  );

  console.log('✅ Test 6 pasado: Rangos calculados correctamente');
  console.log('Rangos:', migrated.ranges);

  console.groupEnd();
}

// Ejecutar todos los tests
export function runAllMigrationTests() {
  console.clear();
  console.log('🧪 Ejecutando tests de migración de simulación...\n');

  try {
    testDetectLegacyFormat();
    testMigrateLegacyData();
    testDoNotMigrateNewFormat();
    testValidateResults();
    testInvalidResults();
    testRangeCalculation();

    console.log('\n✅ Todos los tests de migración pasaron correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
}

// Instrucciones para ejecutar en consola del navegador
console.info(`
📋 Para ejecutar los tests de migración:

1. Importa este módulo en tu código
2. En la consola del navegador ejecuta:

   import { runAllMigrationTests } from './src/shared/utils/__tests__/simulationMigration.manual.test';
   runAllMigrationTests();

O copia y pega cada función individualmente y ejecútalas.
`);
