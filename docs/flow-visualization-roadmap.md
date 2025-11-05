# Hoja de ruta animaci�n hidr�ulica 2D

Ultima actualizacion: 2025-11-04

1. [x] Definir nuevo modelo de resultados con series temporales
   - Extendido `SimulationResults` en `src/shared/types/hydro.ts` con timesteps, rangos, duration y reportStep
   - Agregados selectors `useCurrentTimestep`, `useSimulationRanges` y `usePlaybackControls` en `src/shared/state/editorStore.ts`
   - Creado sistema de migraci�n autom�tica en `src/shared/utils/simulationMigration.ts`
   - Estado de reproducci�n (play/pause, velocidad, timestep actual) integrado en el store

2. [x] Ajustar la configuraci�n de EPANET para simulaciones transitorias
   - Actualizar `src/modules/simulation/inpBuilder.ts` para exponer duraci�n, intervalo hidr�ulico y de reporte (por ahora constantes razonables, luego configurables).
   - Garantizar que tanques, bombas y patrones tengan par�metros por defecto compatibles con simulaciones de varias horas.
   - Exponer utilidades para transformar unidades si se modifica la resoluci�n temporal.

3. [x] Capturar series temporales completas en `epanet.worker.ts`
   - Reemplazado `solveH` por el ciclo `openH / initH / runH / nextH` para obtener cada timestep antes de cerrar el proyecto.
   - Serializados por timestep nodos (presi�n, demanda, head, nivel de tanque) y enlaces (flujo, velocidad, headloss, estado) con su marca temporal acumulada.
   - Calculados res�menes globales (rangos, max/min) y preservadas las vistas legacy (`nodes`, `links`) apuntando al �ltimo timestep.

4. [x] Actualizar `useSimulationRunner` y el store para manejar series
   - Validar la nueva estructura antes de persistir y limpiar el estado pendiente al iniciar una simulaci�n.
   - Propagar el timestep inicial (0) a la UI y al viewer 3D; agregar acciones en el store para seleccionar un timestep o reproducir animaciones.
   - Revisar `SimulationPanel.tsx` para mostrar mensajes �tiles cuando la simulaci�n no devuelve data temporal.

5. [x] Crear servicios de mapeo de datos a propiedades visuales
   - Implementado `simulationVisualMapping.ts` con helpers para colores, grosores, opacidades y detecci�n de criticidad.
   - Definidas escalas compartidas y generadores de leyenda en base a los rangos globales de la simulaci�n.
   - Explicado el uso del m�dulo en la documentaci�n y preparado para reutilizaci�n en las vistas 2D/3D.

6. [x] Construir un reproductor de simulaci�n en la UI
   - Dise�ado `SimulationTimeline` con play/pause, slider y selector de velocidad apoyado en `usePlaybackControls`.
   - Integrado en `SimulationPanel.tsx`, sincronizado con el store y con el overlay temporal del visor 3D.
   - Reproducci�n autom�tica que se detiene al final y expone tiempos transcurridos/duraci�n para futuros overlays.

7. [x] Integrar el mapeo visual en el canvas 2D (`EditorCanvas`)
   - Aplicar `computeLinkVisualStyle` y `computeNodeVisualStyle` para colorear tuber�as y nodos seg�n presi�n/caudal.
   - Sincronizar el canvas con `useCurrentTimestep` para refrescar estilos al avanzar la simulaci�n.
   - A�adir estados destacados para elementos cr�ticos directamente en 2D.

8. [x] Implementar animaciones de flujo en 2D
   - Dibujar partículas o trazos que recorran cada enlace en función del flujo y velocidad del timestep actual.
   - Representar niveles de tanque mediante rellenos o indicadores verticales sobre los nodos de tipo tanque.
   - Añadir transiciones suaves entre timesteps para evitar saltos bruscos.
   - Flechas direccionales que muestran la dirección del flujo en cada tubería.
   - Tuberías más anchas (6-16px) y colores más brillantes (#3b82f6 a #f97316) para mejor visibilidad.

9. [x] Crear overlays y leyendas 2D
   - Mostrar una leyenda actualizable con rangos de color/intensidad usados en el canvas.
   - Exponer badges o tooltips con datos clave del timestep para el elemento seleccionado.
   - Incorporar alertas visuales persistentes para componentes críticos.

10. [x] Ajustes finales y preparación para 3D
   - Medir performance del canvas 2D con redes grandes y optimizar redibujado.
   - ~~Documentar el flujo de simulación 2D y dejar checklist para reactivar las tareas 3D en el futuro.~~
   - ~~Reagendar las actividades 3D una vez validada la experiencia 2D.~~

---

## Optimizaciones de Performance Implementadas

- **Loop de animación optimizado**: useCallback + deltaTime real basado en timestamps
- **Control de FPS**: Limita deltaTime para evitar saltos cuando el tab está inactivo
- **Memoización de cálculos**: Flechas direccionales pre-calculadas con useMemo
- **Partículas limitadas**: Máximo 4 partículas por enlace (reducido de 8)
- **Layer separado**: Partículas en Layer independiente con listening=false
- **PerfectDraw deshabilitado**: En partículas para mejor performance de canvas
