# Modelo de Resultados con Series Temporales

## Descripción General

El nuevo modelo de `SimulationResults` está diseñado para soportar animaciones hidráulicas en tiempo real. En lugar de almacenar solo un estado estático final, ahora capturamos el comportamiento del sistema a lo largo del tiempo mediante una serie de timesteps.

## Estructura de Datos

### SimulationResults

```typescript
interface SimulationResults {
  generatedAt: string;        // Timestamp ISO de generación
  duration: number;            // Duración total simulada (segundos)
  reportStep: number;          // Intervalo entre timesteps (segundos)
  
  // Resumen agregado (compatibilidad)
  summary: {
    maxPressure: number;
    minPressure: number;
    maxFlow: number;
  };
  
  // Rangos globales para escalar visualizaciones
  ranges: SimulationRanges;
  
  // Serie temporal completa
  timesteps: SimulationTimestep[];
  
  // Vista instantánea final (deprecated)
  nodes: SimulationNodeResult[];
  links: SimulationLinkResult[];
}
```

### SimulationTimestep

Cada timestep representa el estado completo del sistema en un instante:

```typescript
interface SimulationTimestep {
  time: number;                        // Segundos desde inicio
  nodes: SimulationNodeResult[];       // Estado de todos los nodos
  links: SimulationLinkResult[];       // Estado de todos los enlaces
}
```

### SimulationNodeResult

Estado de un nodo en un timestep específico:

```typescript
interface SimulationNodeResult {
  id: string;
  label: string;
  pressure: number;      // kPa o psi
  demand: number;        // L/s o gpm
  head: number;          // m o ft
  tankLevel?: number;    // Nivel si es tanque (m o ft)
}
```

### SimulationLinkResult

Estado de un enlace en un timestep específico:

```typescript
interface SimulationLinkResult {
  id: string;
  label: string;
  flow: number;          // L/s o gpm (positivo: from→to, negativo: to→from)
  velocity: number;      // m/s o ft/s
  status: 'OPEN' | 'CLOSED';
  headloss: number;      // m o ft
}
```

### SimulationRanges

Rangos globales min/max para toda la simulación:

```typescript
interface SimulationRanges {
  pressure: { min: number; max: number };
  flow: { min: number; max: number };
  velocity: { min: number; max: number };
  tankLevel?: { min: number; max: number };
}
```

## Estado del Store

El store Zustand mantiene:

```typescript
interface SimulationState {
  status: 'idle' | 'running' | 'success' | 'error';
  results?: SimulationResults;
  error?: SimulationErrorDetail[];
  
  // Control de reproducción
  currentTimestepIndex: number;    // Índice actual (0-based)
  isPlaying: boolean;              // Estado play/pause
  playbackSpeed: number;           // Multiplicador velocidad (0.1 - 10.0)
}
```

## Acciones del Store

### Navegación de Timesteps

```typescript
// Establecer timestep específico
setCurrentTimestep(index: number): void

// Navegar secuencialmente
nextTimestep(): void
previousTimestep(): void
```

### Control de Reproducción

```typescript
// Alternar reproducción
togglePlayback(): void

// Configurar velocidad (clamp entre 0.1 y 10.0)
setPlaybackSpeed(speed: number): void
```

## Hooks Útiles

### useCurrentTimestep

Obtiene el timestep actualmente visible:

```typescript
const currentTimestep = useCurrentTimestep();
// returns SimulationTimestep | null

if (currentTimestep) {
  console.log(`Tiempo: ${currentTimestep.time}s`);
  console.log(`Nodos: ${currentTimestep.nodes.length}`);
}
```

### useSimulationRanges

Obtiene los rangos globales:

```typescript
const ranges = useSimulationRanges();
// returns SimulationRanges | undefined

if (ranges) {
  const normalizedPressure = (pressure - ranges.pressure.min) / 
                              (ranges.pressure.max - ranges.pressure.min);
}
```

### usePlaybackControls

Control completo de reproducción:

```typescript
const {
  currentIndex,       // Índice actual
  isPlaying,          // Estado reproducción
  playbackSpeed,      // Velocidad actual
  totalTimesteps,     // Total de timesteps
  setCurrentTimestep, // Función para saltar
  nextTimestep,       // Avanzar
  previousTimestep,   // Retroceder
  togglePlayback,     // Play/Pause
  setPlaybackSpeed,   // Cambiar velocidad
} = usePlaybackControls();
```

## Migración de Datos Antiguos

El sistema detecta y migra automáticamente resultados en formato antiguo:

1. **Detección**: `isLegacySimulationResults()` verifica ausencia de `timesteps`
2. **Migración**: `migrateLegacyResults()` crea un timestep único con datos existentes
3. **Limpieza**: `cleanLegacySimulationData()` se ejecuta al iniciar la app (en `main.tsx`)

### Formato Legacy

El formato antiguo solo tenía:

```typescript
interface OldSimulationResults {
  generatedAt: string;
  summary: { ... };
  nodes: SimulationNodeResult[];    // Solo estado final
  links: SimulationLinkResult[];    // Solo estado final
}
```

### Migración Automática

Los campos legacy `nodes` y `links` ahora están **deprecated** pero se mantienen por compatibilidad. Siempre contienen el último timestep:

```typescript
// Equivalente después de migración:
results.nodes === results.timesteps[results.timesteps.length - 1].nodes
```

## Uso en Componentes

### Ejemplo: Mostrar Tiempo Actual

```typescript
import { useCurrentTimestep } from '@/shared/state/editorStore';

function SimulationTimeline() {
  const timestep = useCurrentTimestep();
  
  if (!timestep) return <div>No hay datos de simulación</div>;
  
  return <div>Tiempo: {timestep.time.toFixed(1)}s</div>;
}
```

### Ejemplo: Control de Reproducción

```typescript
import { usePlaybackControls } from '@/shared/state/editorStore';

function PlaybackPanel() {
  const {
    isPlaying,
    playbackSpeed,
    togglePlayback,
    setPlaybackSpeed
  } = usePlaybackControls();
  
  return (
    <div>
      <button onClick={togglePlayback}>
        {isPlaying ? 'Pausar' : 'Reproducir'}
      </button>
      <input
        type="range"
        min="0.1"
        max="5"
        step="0.1"
        value={playbackSpeed}
        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
      />
    </div>
  );
}
```

### Ejemplo: Visualización 3D Reactiva

```typescript
import { useCurrentTimestep, useSimulationRanges } from '@/shared/state/editorStore';

function Pipe3D({ linkId }: { linkId: string }) {
  const timestep = useCurrentTimestep();
  const ranges = useSimulationRanges();
  
  const linkData = timestep?.links.find(l => l.id === linkId);
  
  if (!linkData || !ranges) return null;
  
  // Normalizar flujo a color
  const flowNorm = Math.abs(linkData.flow) / ranges.flow.max;
  const color = flowNorm > 0.7 ? 'red' : flowNorm > 0.3 ? 'yellow' : 'blue';
  
  return <mesh><boxGeometry /><meshStandardMaterial color={color} /></mesh>;
}
```

## Validación

El módulo incluye validación de estructura:

```typescript
import { validateSimulationResults } from '@/shared/utils/simulationMigration';

const validation = validateSimulationResults(results);
if (!validation.valid) {
  console.error('Errores:', validation.errors);
}
```

## Próximos Pasos

Con este modelo implementado, los siguientes pasos son:

1. **Configurar EPANET** para generar múltiples timesteps (punto 2 de roadmap)
2. **Capturar series temporales** en el worker (punto 3)
3. **Crear componente Timeline** con controles de reproducción (punto 6)
4. **Animar visualización 3D** usando los timesteps (puntos 7-8)

## Notas Técnicas

- **Persistencia**: Solo `network`, `unitSystem` y `viewMode` persisten en localStorage. Los resultados de simulación se regeneran
- **Performance**: Con timesteps grandes, considerar throttling en actualizaciones del store
- **Interpolación**: Para animaciones suaves, considerar interpolar entre timesteps adyacentes
- **Memoria**: Resultados grandes (muchos timesteps × muchos elementos) pueden consumir memoria. Considerar streaming o compresión
## Mapeo Visual de Resultados

El módulo `src/modules/simulation/simulationVisualMapping.ts` traduce los valores hidráulicos de cada timestep en estilos visuales reutilizables tanto en 2D como en 3D.

### Funciones principales

```typescript
computeLinkVisualStyle(link, ranges, options)
computeNodeVisualStyle(node, ranges, options)
computeLegendStops(ranges, metric, steps?)
```

- **Métricas soportadas**: `pressure`, `flow`, `velocity`, `tankLevel`.
- **Estilo devuelto**: `color`, `width`, `opacity`, `intensity` (0-1) y `isCritical`.
- **Detección de fallas**: si `highlightIssues` está activo, enlaces sin flujo o con velocidad muy baja y nodos con presión casi nula se marcan como críticos (`color` rojo y mayor opacidad).
- **Leyenda**: `computeLegendStops` devuelve colores distribuidos uniformemente entre el valor mínimo y máximo de la métrica para construir leyendas consistentes.

### Ejemplo de uso

```typescript
import {
  computeLinkVisualStyle,
  computeLegendStops,
} from '@/modules/simulation/simulationVisualMapping';
import { useCurrentTimestep, useSimulationRanges } from '@/shared/state/editorStore';

const timestep = useCurrentTimestep();
const ranges = useSimulationRanges();

if (timestep && ranges) {
  const style = computeLinkVisualStyle(timestep.links[0], ranges, {
    metric: 'flow',
    highlightIssues: true,
  });

  const legend = computeLegendStops(ranges, 'flow');
}
```

Con el Punto 5 cubierto, la UI puede comenzar a visualizar el comportamiento hidráulico por timestep y resaltar zonas problemáticas, preparando el terreno para el reproductor del Punto 6.
## Timeline de simulación

El componente `SimulationTimeline` (`src/modules/simulation/SimulationTimeline.tsx`) ofrece controles de reproducción (play/pause, paso anterior/siguiente), selección de timestep vía slider y ajuste de velocidad (`0.25×` a `4×`). Se sincroniza con el store (`usePlaybackControls`) y actualiza automáticamente el timestep activo respetando el `reportStep` definido por EPANET.

La reproducción se detiene al alcanzar el último timestep y puedes ajustar la velocidad sin perder la posición actual. El componente expone además información de tiempo transcurrido versus duración total, y utiliza los rangos globales para ofrecer contexto rápido antes de mapear valores en 2D/3D.
