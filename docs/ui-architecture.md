# UI Architecture & Layout - HidroHome

**Última actualización**: 5 de noviembre de 2025

---

## 📐 Estructura de Componentes Actual

### **Arquitectura Principal (Mantine AppShell)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Header (68px altura)                     │
│  Logo + Nombre proyecto + Switch 2D/3D + Unidades          │
│  + Import/Export + Ayuda                                    │
└─────────────────────────────────────────────────────────────┘
┌────────────┬───────────────────────────┬────────────────────┐
│  Navbar    │      Main (Centro)        │      Aside         │
│  (280px    │                           │    (320px fijo)    │
│  ancho     │  EditorCanvas (2D) o      │                    │
│  redimen-  │  Simple3DViewer (3D)      │  SelectionInspector│
│  sionable) │                           │         +          │
│            │  + SimulationLegend       │  SimulationPanel   │
│  Catalog   │  + CriticalAlertsPanel    │    (con Timeline)  │
│  Panel     │  + ElementTooltip         │                    │
│            │                           │                    │
└────────────┴───────────────────────────┴────────────────────┘
```

---

## 🗂️ Componentes por Ubicación

### **1. Header (AppShell.Header)**
**Archivo**: `src/app/App.tsx`  
**Altura**: 68px  
**Contenido**:

- **Izquierda**:
  - Logo "HidroHome" (Text fw={700})
  - TextInput para nombre del proyecto
    - Indicador "mod" (naranja) si hay cambios sin guardar
    - Ancho: 240px

- **Derecha**:
  - Switch: Vista 2D/3D
  - Select: Sistema de unidades (AR, US, SI) - 220px
  - FileButton + Button: Importar proyecto
  - Button: Exportar proyecto  
  - ActionIcon: Ayuda (abre Modal con guía)

**Modal de Ayuda**:
- Título: "Ayuda de HidroHome"
- Tamaño: xl
- Contenido: Guía paso a paso (crear red, conectar, configurar, simular, guardar)

---

### **2. Navbar (Panel Izquierdo)**
**Archivo**: `src/modules/catalog/CatalogPanel.tsx`  
**Ancho**: 280px (redimensionable 220-420px)  
**Función**: Catálogo de elementos

**Estructura**:
```tsx
ScrollArea
└── Stack (gap="md", py="sm", pr="sm")
    └── Por cada sección del catálogo:
        ├── Text (título categoría, uppercase, dimmed)
        └── Stack de items
            └── Tooltip (descripción)
                └── Paper (draggable si es node)
                    └── Group
                        ├── Icon + nombre + descripción
                        └── Badge "Arrastrar" (nodes) o
                            Button "Usar/Activo" (links)
```

**Secciones del catálogo**:
- Nodos de demanda
- Almacenamiento
- Tuberías
- Componentes activos

**Interacciones**:
- Drag & drop para nodos → canvas
- Click en links para activar template de conexión
- Handle de redimensión en borde derecho

---

### **3. Main (Centro - Vista Principal)**

#### **Opción A: EditorCanvas (Vista 2D)**
**Archivo**: `src/modules/editor/EditorCanvas.tsx`  
**Tecnología**: react-konva (Canvas HTML5)  
**Padding**: md (cuando viewMode === '2d')

**Capas de renderizado (de atrás hacia adelante)**:

1. **Grid Layer**: 
   - Fondo blanco
   - Cuadrícula con líneas grises

2. **Links Layer**:
   - Líneas conectando nodos (Line de Konva)
   - Color/grosor dinámico según simulación
   - Flechas direccionales de flujo (Line con fill)
   - **Partículas animadas** (Circle) de flujo de agua
   - Sistema de transiciones suaves entre timesteps

3. **Nodes Layer**:
   - Círculos coloreados (Circle de Konva)
   - Borde más grueso si está seleccionado
   - Efectos visuales de pulsación en elementos críticos
   - Labels con nombres (Text de Konva)
   - Indicadores de nivel de tanque

4. **UI Overlay Layer**:
   - Línea temporal al crear conexión (Line)
   - Feedback visual durante interacción

**Controles del Canvas**:
- **Shift + Drag**: Pan (desplazar vista)
- **Rueda del mouse**: Zoom in/out
- **Click en elemento**: Seleccionar
- **Drag de nodo**: Mover posición
- **Drop desde catálogo**: Crear nodo nuevo
- **Click en nodo + Click en otro nodo**: Crear link (si hay template activo)

**Sistema de animación**:
- Loop con `requestAnimationFrame`
- Actualización de partículas cada frame
- Transiciones interpoladas entre timesteps (300ms)
- Sistema de lerp para colores y valores

---

#### **Componentes flotantes en EditorCanvas**:

##### **CanvasToolbar**
**Archivo**: `src/modules/editor/CanvasToolbar.tsx`  
**Posición**: Absoluta - `top: 16px, left: 16px, right: 16px`  
**Z-index**: 100

**Contenido**:
- Group horizontal centrado con gap="xs"
- Fondo semitransparente con backdrop-filter blur

**Herramientas actuales**:
- **ActionIcon**: Toggle de leyenda (IconChartBar)
  - Variant: filled (visible) / light (oculta)
  - Color: blue
  - Tooltip con estado actual
- **ActionIcon**: Toggle de alertas (IconAlertTriangle)
  - Variant: filled (visible) / light (oculta)
  - Color: red
  - Tooltip con estado actual

**Propósito**:
- Control de visibilidad de paneles flotantes
- Acceso rápido a herramientas de edición (próximamente)
- Controles de visualización (próximamente)

**Características**:
- Ancho completo del canvas (con márgenes de 16px)
- Diseño responsivo
- Estilo consistente con otros paneles flotantes
- Estado sincronizado con store de Zustand

---

##### **SimulationLegend**
**Archivo**: `src/modules/editor/SimulationLegend.tsx`  
**Tecnología**: DraggableFloatingPanel wrapper  
**Posición por defecto**: Esquina superior derecha `{x: window.innerWidth - 276, y: 16}`  
**Ancho**: 260px  
**Z-index**: 100

**Contenido**:
- **Header draggable** con IconGripVertical + título + botón cerrar
- **Control de expansión**: IconChevronUp/Down para colapsar contenido
- **Leyenda de Flujo** (5 stops de color con valores en L/s)
- **Leyenda de Presión** (5 stops de color con valores en kPa)
- **Leyenda de Partículas** (indicadores visuales de flujo)
- **Indicadores Críticos** (colores de alerta)
- Texto explicativo de interpretación
- Fondo semitransparente con backdrop-filter blur

**Interacciones**:
- **Arrastrable**: Click y drag en el header para mover
- **Cerrable**: Botón X en header (persiste posición)
- **Mostrable**: Desde CanvasToolbar (botón azul)
- **Colapsable**: Botón chevron para minimizar contenido
- **Posición persistente**: La posición se guarda en el store

**Estados**:
- Solo visible si hay simulación activa
- **Se muestra automáticamente** cuando hay resultados de simulación
- Estado de visibilidad controlado por store
- Posición personalizada guardada en store

---

##### **CriticalAlertsPanel**
**Archivo**: `src/modules/editor/CriticalAlertsPanel.tsx`  
**Tecnología**: DraggableFloatingPanel wrapper  
**Posición por defecto**: Esquina superior izquierda `{x: 16, y: 80}`  
**Ancho**: 340px  
**Z-index**: 101 (sobre SimulationLegend)

**Función**: Detección automática y visualización de problemas

**Contenido**:
- **Header draggable** con IconGripVertical + IconAlertTriangle + título + contador + botón cerrar
- **Control de expansión**: IconChevronUp/Down para colapsar contenido
- **ScrollArea**: Lista scrolleable de alertas (max 50vh)
- Fondo con tinte rojo claro (rgba(254, 242, 242))

**Tipos de alertas**:
- **Nodos sin presión** (severity: high, badge roja)
- **Presión crítica baja** (severity: medium, badge naranja)
- **Links sin flujo** (severity: high, badge roja)
- **Flujo crítico bajo** (severity: medium, badge naranja)

**Contenido por alerta**:
- Badge de severidad (ALTA/MEDIA)
- Icono (IconGauge para nodos, IconDroplet para links)
- Label del elemento
- Descripción del problema
- Valor + unidad (formato argentino)
- Hover effect (desplazamiento y sombra)
- Click → selecciona elemento problemático

**Interacciones**:
- **Arrastrable**: Click y drag en el header para mover
- **Cerrable**: Botón X en header (persiste posición)
- **Mostrable**: Desde CanvasToolbar (botón rojo)
- **Colapsable**: Botón chevron para minimizar contenido
- **Posición persistente**: La posición se guarda en el store
- **Click en alerta**: Selecciona el elemento en el canvas

**Estados**:
- Solo visible si hay simulación activa Y hay alertas
- **Se muestra automáticamente** cuando hay timestep con alertas
- Ordenadas por severidad (high primero)
- Estado de visibilidad controlado por store

---

##### **ElementTooltip**
**Archivo**: `src/modules/editor/ElementTooltip.tsx`  
**Función**: Mostrar datos en tiempo real del elemento seleccionado

**Para nodos**:
- Label
- Tipo
- Presión (kPa)
- Demanda (L/s)
- Cota (m)
- Si es tanque: Nivel (m)

**Para links**:
- Label (From → To)
- Tipo
- Flujo (L/s)
- Velocidad (m/s)
- Longitud (m)

**Características**:
- Badge "CRÍTICO" si elemento tiene problemas
- Formato de números en estilo argentino (punto miles, coma decimal)

---

#### **Opción B: Simple3DViewer (Vista 3D)**
**Archivo**: `src/modules/viewer3d/Simple3DViewer.tsx`  
**Tecnología**: Three.js + OrbitControls  
**Padding**: 0 (cuando viewMode === '3d')

**Elementos de la escena**:

1. **Scene**:
   - Background: 0xf8fafc (gris muy claro)

2. **Lighting**:
   - AmbientLight: 0xffffff, intensidad 0.7
   - DirectionalLight: 0xffffff, intensidad 0.6, posición (6, 10, 4)

3. **Ground**:
   - PlaneGeometry: 24x14 unidades (escala 1:50 del canvas 2D)
   - Color: 0xe2e8f0
   - GridHelper: 24 divisiones, colores 0x94a3b8 y 0xcbd5f5

4. **Nodos**:
   - BoxGeometry (1×1×1) para nodos regulares
   - CylinderGeometry (0.8 radio, 2 altura) para tanques
   - Color según tipo de dispositivo del catálogo
   - Posición escalada: `pos_3d = pos_2d / 50`

5. **Links**:
   - CylinderGeometry (radio 0.05, longitud = distancia)
   - Rotación calculada para conectar nodos
   - Color según tipo de tubería

**Cámara**:
- PerspectiveCamera (FOV 55°)
- Posición inicial: (12, 12, 20)
- LookAt: centro de la grilla

**Controles**:
- **OrbitControls**: Drag para orbitar, rueda para zoom, botón derecho para pan
- **ActionIcons de navegación**:
  - Flechas direccionales (arriba, abajo, izq, der)
  - Zoom + / -
  - Reset (volver a posición inicial)

**HUD Superior**:
- Estado de simulación
- Timestep actual / Total
- Formato de tiempo (formatSeconds)

**⚠️ Limitaciones actuales**:
- Visualización estática (no muestra flujo animado)
- No hay colores dinámicos según simulación
- No hay partículas de agua
- No hay tanques con nivel de agua visible
- Pendiente implementar según `docs/flow-visualization-roadmap.md`

---

### **4. Aside (Panel Derecho)**
**Ancho**: 320px (fijo)  
**Padding**: md  
**Contenido**: ScrollArea con Stack

#### **SelectionInspector**
**Archivo**: `src/modules/editor/SelectionInspector.tsx`

**Estados**:

1. **Sin selección**:
   - Text dimmed: "Selecciona un elemento para ver y editar sus propiedades."

2. **Nodo seleccionado**:
   - Header: Label + Button "Eliminar" (rojo)
   - Text: Tipo de dispositivo
   - **Campos editables**:
     - TextInput: Etiqueta
     - NumberInput: Demanda base (L/s)
     - NumberInput: Cota (m)
   - **Si es tanque** (Divider "Tanque"):
     - NumberInput: Nivel inicial (m)
     - NumberInput: Diámetro (m)
     - NumberInput: Altura mínima (m)
     - NumberInput: Altura máxima (m)
   - **Si es reservorio** (Divider "Reservorio"):
     - NumberInput: Nivel de cabeza (m)
   - **Datos de simulación** (si existen):
     - Text: Presión (kPa)
     - Text: Demanda actual (L/s)
     - Text: Nivel tanque (m) [solo tanques]

3. **Link seleccionado**:
   - Header: From → To + Button "Eliminar"
   - Text: Tipo
   - **Campos editables**:
     - NumberInput: Longitud (m)
     - NumberInput: Diámetro (mm)
     - NumberInput: Rugosidad
     - Switch: Estado (Abierto/Cerrado)
   - **Datos de simulación** (si existen):
     - Text: Flujo (L/s)
     - Text: Velocidad (m/s)

---

#### **SimulationPanel**
**Archivo**: `src/modules/simulation/SimulationPanel.tsx`

**Estructura**:
```tsx
Stack
├── Header: "Simulación hidráulica" + Loader (si running)
├── Button: "Ejecutar simulación" (con IconPlayerPlay)
├── [Si error] Stack de Alerts
│   └── Alert (color="red")
│       ├── title: error.title
│       └── Stack
│           ├── Error: error.description
│           └── Solución: error.solution
└── [Si results] Stack
    ├── Text: Timestamp generado
    ├── [Si sin series] Alert amarillo
    ├── Table: Métricas (withColumnBorders, striped, highlightOnHover)
    │   ├── Presión máxima (kPa)
    │   ├── Presión mínima (kPa)
    │   ├── Caudal máximo (L/s)
    │   ├── Duración simulada (formato tiempo)
    │   ├── Intervalo de reporte (formato tiempo)
    │   ├── Total de timesteps
    │   └── Timestep actual (si reproduciendo)
    └── SimulationTimeline
```

**Características**:
- Loading state durante simulación
- Errores con soluciones sugeridas
- Formato de números argentino (punto miles, coma decimal)
- Integración con unidades del sistema seleccionado

---

#### **SimulationTimeline**
**Archivo**: `src/modules/simulation/SimulationTimeline.tsx`

**Controles de reproducción**:
```tsx
Stack
├── Group (controles de reproducción)
│   ├── ActionIcon: Anterior (IconPlayerTrackPrev)
│   ├── ActionIcon: Play/Pause (IconPlayerPlay/Pause)
│   └── ActionIcon: Siguiente (IconPlayerTrackNext)
├── Slider: Timeline de timesteps
│   ├── value: currentIndex
│   ├── max: totalTimesteps - 1
│   ├── marks: timesteps clave
│   └── onChange: setCurrentTimestep
├── Group (info + velocidad)
│   ├── Text: "Timestep X/Y - Tiempo"
│   └── SegmentedControl: Velocidad
│       └── Opciones: 0.25×, 0.5×, 1×, 2×, 4×
└── Text dimmed: Instrucciones de uso
```

**Sistema de reproducción**:
- Loop con `requestAnimationFrame`
- Velocidades variables (0.25× a 4×)
- Duración calculada desde `reportStep` de EPANET
- Mínimo 100ms entre frames
- Auto-stop al llegar al final

**Estados**:
- Solo visible si hay timesteps disponibles
- Slider deshabilitado si solo hay 1 timestep
- Indicadores visuales de reproducción activa

---

## 🎨 Sistema de Estilos

### **Providers**
**Archivo**: `src/app/AppProviders.tsx`

```tsx
MantineProvider (defaultColorScheme="light")
└── Notifications (position="top-right")
    └── {children}
```

### **CSS Global**
**Archivo**: `src/styles/global.css`
- Estilos base de reset
- Variables de Mantine
- Utilidades globales

### **Colores por tipo de elemento**:

**Nodos** (definidos en `src/shared/constants/catalog.tsx`):
- Fixture (lavabo, ducha, etc.): `#3b82f6` (azul)
- Tank: `#8b5cf6` (púrpura)
- Reservoir: `#06b6d4` (cyan)
- Junction: `#6b7280` (gris)

**Links**:
- Pipe: `#ef4444` (rojo)
- Pump: `#f59e0b` (ámbar)
- Valve: `#10b981` (verde)

**Simulación** (visual mapping):
- Flujo: Escala de azul (bajo) a azul oscuro (alto)
- Presión: Escala de rojo (bajo) a verde (alto)
- Crítico: Rojo pulsante con opacity animada

---

## 🔄 Flujo de Interacción

### **Creación de elementos**:
1. Usuario arrastra item del CatalogPanel
2. Suelta en EditorCanvas
3. `addNode` → Store actualiza
4. Canvas re-renderiza
5. Autosave activa (500ms debounce)

### **Conexión de elementos**:
1. Usuario hace click en botón "Usar" de link en catálogo
2. `setActiveLinkTemplate` → Store actualiza
3. Usuario hace click en nodo origen
4. `setLinkStartNode` → Store guarda origen
5. Usuario hace click en nodo destino
6. `completeLinkTo` → Store crea link
7. Canvas re-renderiza con nuevo link

### **Simulación**:
1. Usuario hace click en "Ejecutar simulación"
2. `useSimulationRunner` valida red
3. Worker recibe `HydroNetwork`
4. `inpBuilder` genera archivo .inp
5. `epanet-js` (WASM) ejecuta simulación
6. Worker envía resultados
7. Store actualiza `simulationState`
8. Canvas y panels re-renderizan con datos
9. Timeline aparece si hay timesteps

### **Reproducción de timesteps**:
1. Usuario hace click en Play
2. `togglePlayback` → Store actualiza
3. `SimulationTimeline` inicia loop de animación
4. Cada tick: `nextTimestep` avanza índice
5. `EditorCanvas` detecta cambio de timestep
6. Inicia transición (300ms) con lerp de colores
7. Partículas se regeneran según nuevo flujo
8. Visual feedback se actualiza suavemente

---

## 📊 Estado de Desarrollo

### ✅ **Implementado**:
- Layout responsivo con AppShell
- Catálogo drag & drop funcional
- Editor 2D con zoom/pan
- Simulación EPANET integrada
- Visualización 3D básica
- Inspector de propiedades dinámico
- Timeline con controles de reproducción
- Sistema de partículas de flujo en 2D
- Transiciones suaves entre timesteps
- Detección de elementos críticos
- Leyendas dinámicas
- Formato de números localizado (AR)
- Autosave con IndexedDB
- Import/export de proyectos
- Sistema de unidades múltiple
- **Barra de herramientas horizontal en canvas (CanvasToolbar)** ✨
- **Paneles flotantes arrastrables y cerrables** ✨ _Nuevo_
  - SimulationLegend draggable
  - CriticalAlertsPanel draggable
  - DraggableFloatingPanel component reutilizable
  - Control de visibilidad desde CanvasToolbar
  - Posiciones personalizadas guardadas en store

### 🚧 **En progreso**:
- Extracción de time-series de EPANET (ver `docs/time-series-data-model.md`)
- Animación de flujo en 3D (ver `docs/flow-visualization-roadmap.md`)
- Población de CanvasToolbar con más herramientas

### ❌ **Pendiente**:
- Tema oscuro
- Paneles colapsables
- Minimap
- Dashboard de métricas
- Historial de deshacer/rehacer
- Shortcuts de teclado
- Touch gestures para mobile
- Export de visualizaciones (PNG, video)

---

## 🗺️ Roadmap de Mejoras UI/UX

### **Fase 1: Usabilidad Básica** (Prioridad Alta)
**Objetivo**: Hacer la interfaz más intuitiva y accesible

#### 1.1 Paneles Colapsables
- [ ] Navbar colapsable con toggle button
- [ ] Aside colapsable independiente
- [ ] CriticalAlertsPanel colapsable
- [ ] SimulationLegend remember estado (localStorage)
- [ ] Iconos en bordes para colapsar/expandir
- [ ] Animaciones suaves de transición

**Beneficio**: Maximizar espacio para canvas, mejor en pantallas pequeñas

#### 1.2 Reorganización de Aside
- [ ] Usar Tabs en lugar de Stack vertical
- [ ] Tab "Propiedades" → SelectionInspector
- [ ] Tab "Simulación" → SimulationPanel
- [ ] Tab "Análisis" → Gráficos y estadísticas (nuevo)
- [ ] Indicadores de contenido activo en tabs

**Beneficio**: Reducir scroll, mejor organización visual

#### 1.3 Toolbar Horizontal en Canvas ✅ _Completado_
- [x] Crear componente `CanvasToolbar.tsx`
- [x] Posicionamiento superior horizontal (full width)
- [x] Integración en EditorCanvas
- [x] Estilo consistente con otros paneles flotantes
- [x] **Botón toggle de leyenda de simulación** ✨
- [x] **Botón toggle de alertas críticas** ✨
- [ ] Agregar botones de herramientas: Seleccionar, Pan, Zoom fit
- [ ] Toggle de grid on/off
- [ ] Toggle de labels on/off
- [ ] Toggle de partículas on/off
- [ ] Botón de eliminar elemento seleccionado
- [ ] Tooltip para cada herramienta

**Beneficio**: Acceso rápido a herramientas comunes, mejor flujo de trabajo

#### 1.4 Paneles Flotantes Arrastrables ✅ _Completado_
- [x] Crear componente reutilizable `DraggableFloatingPanel`
- [x] Sistema de drag & drop para mover paneles
- [x] Botón de cerrar en cada panel
- [x] Estado de visibilidad en store (Zustand)
- [x] Persistencia de posiciones personalizadas
- [x] Integrar SimulationLegend con draggable panel
- [x] Integrar CriticalAlertsPanel con draggable panel
- [x] Botones de toggle en CanvasToolbar

**Beneficio**: Personalización del espacio de trabajo, mejor organización visual

---

### **Fase 2: Visualización Avanzada** (Prioridad Alta)
**Objetivo**: Mejorar feedback visual y comprensión del sistema

#### 2.1 Mejoras en 3D Viewer
- [ ] Implementar flujo animado (partículas/shaders)
- [ ] Colores dinámicos según presión/flujo
- [ ] Tanques con nivel de agua visible
- [ ] Fixtures con descarga animada
- [ ] Mejor iluminación (sombras, ambient occlusion)
- [ ] Etiquetas flotantes en 3D

**Beneficio**: Cumplir objetivo central del proyecto (visualización de flujo)

**Referencia**: Ver `docs/flow-visualization-roadmap.md`

#### 2.2 Dashboard de Métricas
- [ ] Nuevo componente `MetricsDashboard.tsx`
- [ ] Gráficos de línea (presión/flujo vs tiempo)
- [ ] Gráficos de barras (comparativa de nodos)
- [ ] Heat map de presiones en red
- [ ] Indicadores KPI (% cobertura, eficiencia)
- [ ] Export de gráficos como imagen

**Beneficio**: Análisis profundo de resultados, reportes visuales

#### 2.3 Minimap
- [ ] Vista general del proyecto en esquina
- [ ] Rectángulo indicando viewport actual
- [ ] Click para navegar a zona
- [ ] Tamaño redimensionable
- [ ] Toggle para mostrar/ocultar

**Beneficio**: Navegación en proyectos grandes

---

### **Fase 3: Experiencia de Usuario** (Prioridad Media)
**Objetivo**: Pulir detalles y añadir comodidades

#### 3.1 Tema Oscuro
- [ ] Toggle en Header (Sun/Moon icon)
- [ ] Definir paleta de colores oscuros
- [ ] Actualizar MantineProvider con ambos temas
- [ ] Ajustar colores de canvas (fondo, grid)
- [ ] Ajustar colores de 3D (scene background, lights)
- [ ] Persistir preferencia en localStorage

**Beneficio**: Reducir fatiga visual, preferencia de usuarios

#### 3.2 Shortcuts de Teclado
- [ ] `Ctrl+S`: Guardar/Exportar
- [ ] `Ctrl+O`: Importar
- [ ] `Ctrl+Z` / `Ctrl+Y`: Undo/Redo
- [ ] `Delete` / `Backspace`: Eliminar selección
- [ ] `Space`: Toggle pan tool
- [ ] `Esc`: Cancelar acción / Deseleccionar
- [ ] `Ctrl+A`: Seleccionar todo
- [ ] Panel de ayuda con lista de shortcuts (`?` key)

**Beneficio**: Flujo de trabajo más rápido para usuarios avanzados

#### 3.3 Historial Undo/Redo
- [ ] Agregar actions al store: `undo()`, `redo()`
- [ ] Middleware para guardar snapshots de estado
- [ ] Límite de historial (ej. 50 acciones)
- [ ] Indicadores visuales en UI (botones habilitados/deshabilitados)
- [ ] No guardar cambios de viewport (zoom, pan)

**Beneficio**: Corrección de errores sin perder trabajo

#### 3.4 Mejoras de Accesibilidad
- [ ] Labels ARIA para todos los controles
- [ ] Navegación completa por teclado
- [ ] Focus visible en elementos interactivos
- [ ] Contraste de colores WCAG AA
- [ ] Screen reader support para elementos canvas
- [ ] Mensajes de error descriptivos

**Beneficio**: Inclusión, cumplimiento de estándares

---

### **Fase 4: Features Avanzados** (Prioridad Baja)
**Objetivo**: Capacidades profesionales

#### 4.1 Capas (Layers)
- [ ] Agrupar elementos en capas
- [ ] Toggle visibilidad por capa
- [ ] Lock/unlock de capas
- [ ] Panel de gestión de capas
- [ ] Colores por capa

**Beneficio**: Organización en proyectos complejos

#### 4.2 Templates y Bibliotecas
- [ ] Guardar sub-redes como templates
- [ ] Biblioteca de configuraciones comunes
- [ ] Drag & drop de templates completos
- [ ] Compartir templates entre proyectos

**Beneficio**: Reutilización, estandarización

#### 4.3 Colaboración
- [ ] Export con metadatos de autor
- [ ] Comentarios en elementos
- [ ] Historial de cambios
- [ ] Comparación de versiones (diff visual)

**Beneficio**: Trabajo en equipo, trazabilidad

#### 4.4 Export Avanzado
- [ ] Export de canvas como PNG/SVG
- [ ] Export de 3D como imagen (render)
- [ ] Export de animación como video (WebM)
- [ ] Export de reporte PDF con gráficos
- [ ] Export a formatos CAD (DXF)

**Beneficio**: Presentaciones, documentación

---

## 📝 Notas de Implementación

### **Prioridades por impacto**:
1. **Alto impacto, bajo esfuerzo**: Paneles colapsables, toolbar flotante, tema oscuro
2. **Alto impacto, alto esfuerzo**: 3D animado, dashboard de métricas
3. **Medio impacto, bajo esfuerzo**: Shortcuts, minimap, reorganizar aside
4. **Bajo impacto, alto esfuerzo**: Colaboración, export avanzado

### **Dependencias técnicas**:
- Dashboard de métricas requiere time-series completo de EPANET
- 3D animado requiere time-series + sistema de partículas/shaders
- Undo/redo requiere arquitectura de middleware en Zustand
- Colaboración requiere backend (fuera de scope actual)

### **Compatibilidad**:
- Todas las mejoras deben mantener compatibilidad con proyectos existentes
- Cambios en estructura de datos requieren migración (ver `simulationMigration.ts`)
- UI debe degradar gracefully si faltan datos

---

## 🔧 Mantenimiento de este Documento

**Este archivo debe actualizarse cuando**:
- Se añade un nuevo componente UI
- Se modifica la estructura del AppShell
- Se cambia la ubicación o función de un panel
- Se implementa una mejora del roadmap
- Se detectan nuevas oportunidades de mejora

**Proceso de actualización**:
1. Editar sección "Estructura de Componentes Actual"
2. Actualizar diagramas ASCII si cambia layout
3. Marcar items del roadmap como completados [x]
4. Añadir nuevos items si surgen necesidades
5. Actualizar sección "Estado de Desarrollo"
6. Commit con mensaje: `docs: update ui-architecture with [cambio]`

**Responsables**:
- Desarrolladores frontend
- Copilot (instrucciones en `.github/copilot-instructions.md`)
