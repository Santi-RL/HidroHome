/**
 * Helper para cargar y ejecutar todos los tests manuales.
 * 
 * Importa este archivo en main.tsx durante desarrollo para tener
 * acceso rápido a los tests desde la consola del navegador.
 */

import { runAllMigrationTests } from './simulationMigration.manual.test';
import { runAllStoreTests } from './storeActions.manual.test';
import { runAllSelectorsTests } from './selectors.manual.test';

/**
 * Ejecuta toda la suite de tests.
 */
export function runAllTests() {
  console.clear();
  console.log('🧪 Ejecutando suite completa de tests...\n');
  console.log('='.repeat(60));

  try {
    runAllMigrationTests();
    console.log('\n' + '='.repeat(60) + '\n');

    runAllStoreTests();
    console.log('\n' + '='.repeat(60) + '\n');

    runAllSelectorsTests();
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
  } catch (error) {
    console.error('❌ ERROR EN LA SUITE DE TESTS:', error);
  }
}

/**
 * Muestra ayuda sobre los tests disponibles.
 */
export function showTestHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🧪 Suite de Tests - Series Temporales               ║
╚════════════════════════════════════════════════════════════════╝

📋 COMANDOS DISPONIBLES:

  runAllTests()              - Ejecuta TODOS los tests
  runAllMigrationTests()     - Tests de migración de datos
  runAllStoreTests()         - Tests de acciones del store
  runAllSelectorsTests()     - Tests de selectors del store
  showTestHelp()             - Muestra esta ayuda

────────────────────────────────────────────────────────────────

🔍 TESTS INDIVIDUALES DE MIGRACIÓN:

  testDetectLegacyFormat()
  testMigrateLegacyData()
  testDoNotMigrateNewFormat()
  testValidateResults()
  testInvalidResults()
  testRangeCalculation()

────────────────────────────────────────────────────────────────

🎮 TESTS INDIVIDUALES DEL STORE:

  testSetSimulationResults()
  testNavigateTimesteps()
  testNavigationBounds()
  testPlaybackControls()
  testPlaybackSpeed()
  testResetSimulation()

────────────────────────────────────────────────────────────────

📊 TESTS INDIVIDUALES DE SELECTORS:

  testGetCurrentTimestep()
  testGetSimulationRanges()
  testGetPlaybackControls()
  testStoreReactivity()
  testEmptyDataBehavior()
  testSimulationProgress()

────────────────────────────────────────────────────────────────

💡 EJEMPLO DE USO:

  // Ejecutar todos los tests
  runAllTests()

  // Ver solo tests de migración
  runAllMigrationTests()

  // Ejecutar un test específico
  testNavigateTimesteps()

════════════════════════════════════════════════════════════════
  `);
}

// Exponer globalmente en desarrollo
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).runAllTests = runAllTests;
  (window as any).runAllMigrationTests = runAllMigrationTests;
  (window as any).runAllStoreTests = runAllStoreTests;
  (window as any).runAllSelectorsTests = runAllSelectorsTests;
  (window as any).showTestHelp = showTestHelp;

  // Mostrar ayuda automáticamente
  console.log('🧪 Tests cargados. Ejecuta showTestHelp() para ver comandos disponibles.');
}
