# Hoja de ruta animacion hidraulica

Ultima actualizacion: 2025-10-30

1. [x] Definir nuevo modelo de resultados con series temporales
   - Extendido `SimulationResults` en `src/shared/types/hydro.ts` con timesteps, rangos, duration y reportStep
   - Agregados selectors `useCurrentTimestep`, `useSimulationRanges` y `usePlaybackControls` en `src/shared/state/editorStore.ts`
   - Creado sistema de migración automática en `src/shared/utils/simulationMigration.ts`
   - Estado de reproducción (play/pause, velocidad, timestep actual) integrado en el store

2. [ ] Ajustar la configuracion de EPANET para simulaciones transitorias
   - Actualizar `src/modules/simulation/inpBuilder.ts` para exponer duracion, intervalo hidraulico y de reporte (por ahora constantes razonables, luego configurables).
   - Garantizar que tanques, bombas y patrones tengan parametros por defecto compatibles con simulaciones de varias horas.
   - Exponer utilidades para transformar unidades si se modifica la resolucion temporal.

3. [ ] Capturar series temporales completas en `epanet.worker.ts`
   - Reemplazar el flujo `solveH` por el bucle `project.runHydraulicAnalysis / nextHydraulicStep` de epanet-js y colectar resultados por timestep antes de cerrar el proyecto.
   - Serializar por timestep: enlaces (flujo, velocidad, headloss, estado) y nodos (presion, demanda, head, nivel de tanque) junto a la marca de tiempo acumulada.
   - Conservar un resumen agregado (max/min) para la UI actual y medir el peso del payload final.

4. [ ] Actualizar `useSimulationRunner` y el store para manejar series
   - Validar la nueva estructura antes de persistir y limpiar el estado pendiente al iniciar una simulacion.
   - Propagar el timestep inicial (0) a la UI y al viewer 3D; agregar acciones en el store para seleccionar un timestep o reproducir animaciones.
   - Revisar `SimulationPanel.tsx` para mostrar mensajes utiles cuando la simulacion no devuelve data temporal.

5. [ ] Crear servicios de mapeo de datos a propiedades visuales
   - Implementar en `src/modules/simulation` un modulo (por ejemplo `simulationVisualMapping.ts`) que calcule colores, grosores y opacidades en funcion de presion o flujo.
   - Definir escalas y umbrales compartidos (leyenda) y exponer helpers reutilizables por la UI 2D y 3D.
   - Incluir deteccion de fallas (baja presion, ausencia de flujo, velocidades altas) para resaltar elementos criticos.

6. [ ] Construir un reproductor de simulacion en la UI
   - Disenar un componente `SimulationTimeline` con play/pause, slider y control de velocidad que consuma el store.
   - Integrar el reproductor en `SimulationPanel.tsx` y sincronizarlo con el viewer 3D.
   - Emitir eventos (por ejemplo `onFrameChange`) para que otras vistas reaccionen sin acoplamiento fuerte.

7. [ ] Evolucionar el visor 3D hacia un motor reactivo
   - Evaluar migrar `Simple3DViewer.tsx` a `@react-three/fiber` + `@react-three/drei` para facilitar animaciones y controles, o encapsular un loop propio si se mantiene Three.js puro.
   - Reestructurar la escena para derivar la geometria base del network y aplicar materiales dinamicos provenientes del mapper del paso 5.
   - Incorporar controles de camara (`OrbitControls`), ajuste de luces y resize responsivo sin fugas.

8. [ ] Implementar animaciones de flujo y niveles
   - Anadir particulas o shaders simples que recorran cada tuberia segun el flujo actual y que cambien de velocidad con cada timestep.
   - Animar el nivel de los tanques mediante escalado o clip de la geometria y mostrar el sentido del flujo con flechas o texturas desplazadas.
   - Representar el caudal de los artefactos (fixtures) con emision visual al alcanzar consumos relevantes.

9. [ ] Integrar overlays y leyendas de diagnostico
   - Superponer una leyenda que explique colores o umbrales, junto con indicadores de presion minima, maxima y zonas criticas.
   - Mostrar alertas en la UI cuando se detecten problemas (por ejemplo tanque vacio o presion negativa) durante la reproduccion.
   - Permitir que el usuario centre la camara en elementos con fallas directamente desde el panel de resultados.

10. [ ] Validar rendimiento y experiencia completa
   - Probar con redes de distinto tamano para asegurar 60fps; aplicar instancing o LOD si es necesario.
   - Anadir herramientas de depuracion (por ejemplo visualizar timestep actual y stats) activables solo en desarrollo.
   - Documentar en `README.md` el flujo de simulacion animada y actualizar los ejemplos de proyecto para incluir series temporales.

