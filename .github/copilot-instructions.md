# HidroHome - Copilot Instructions

## Project Overview
HidroHome is a web-based hydraulic network designer and simulator for residential water installations. The app provides a 2D canvas editor, EPANET-powered hydraulic simulation in a Web Worker, and a basic 3D visualization using Three.js.

### Core Objective: Visual Hydraulic Flow Simulation
**The central goal of this project is to provide real-time 3D visual simulation of water flow dynamics.** When the user runs a simulation, they should see:
- Water flowing through pipes in real-time with animated flow direction and speed
- Water accumulating in tanks with dynamic fill levels
- Water exiting through fixtures (sinks, showers, toilets) with visible discharge
- Pressure variations visualized through color gradients on pipes and nodes
- Identification of failure points (low pressure, no flow, air pockets, leaks)

This visual feedback is essential for understanding how a hydraulic installation works and diagnosing problems before construction.

## Architecture

### State Management (Zustand + Persist)
- **Single global store**: `src/shared/state/editorStore.ts` manages the entire application state
- All mutations go through store actions (e.g., `addNode`, `updateLink`, `setSimulationResults`)
- State persists to localStorage automatically via Zustand middleware
- Always use store selectors (e.g., `useNetwork()`, `useSelection()`) in components, never destructure the entire store

### Simulation Pipeline (Web Worker + EPANET)
1. User clicks "Ejecutar simulación" → triggers `useSimulationRunner` hook
2. Network validation runs client-side (`networkValidation.ts`) before sending to worker
3. Worker receives `HydroNetwork` → converts to EPANET `.inp` format via `inpBuilder.ts`
4. `epanet-js` (WASM) runs hydraulic solver and returns results
5. Results flow back through worker message → store → UI updates

**Critical**: Simulation runs in `src/modules/simulation/epanet.worker.ts`. Never attempt to run EPANET on the main thread.

**Current limitation**: EPANET results are returned as summary data, but **time-series data (hydraulic state at each timestep) is not yet extracted**. To enable animated flow visualization, we need to:
- Extract time-series results from EPANET (flow, velocity, pressure at each timestep for all elements)
- Store timestep data in simulation results structure
- Create animation timeline system in 3D viewer that interpolates between timesteps
- Map EPANET output variables (link flow, node pressure, tank level) to visual properties

### Type System
- Core types live in `src/shared/types/hydro.ts`: `HydroNode`, `HydroLink`, `HydroNetwork`
- Node types: `junction` (generic connection point), `fixture` (demand point like sink/shower), `tank`, `reservoir`
- Link types: `pipe`, `pump`, `valve`
- All nodes have `deviceId` field linking back to catalog items in `src/shared/constants/catalog.tsx`

### Canvas Architecture (react-konva)
- 2D editor is in `src/modules/editor/EditorCanvas.tsx`
- Pan with Shift+drag, zoom with mouse wheel
- Nodes render as circles (color-coded by type), links as lines
- Selection state lives in store, not local component state
- Use `updateNodePosition` action for drag operations to trigger autosave

### 3D Visualization Architecture (Three.js)
- Current implementation in `src/modules/viewer3d/Simple3DViewer.tsx` is a **static preview** - it only shows geometry, not flow
- **Needs to be enhanced to animate water flow** based on EPANET simulation results
- Current capabilities: renders nodes (boxes/cylinders) and pipes (cylinders) in 3D space
- **Missing for visual flow simulation:**
  - Time-based animation system reading EPANET timestep data (hydraulic results over time)
  - Particle systems or shader effects for water flow visualization in pipes
  - Dynamic materials with color/opacity changes based on pressure/velocity
  - Tank water level animations showing fill/drain cycles
  - Flow direction indicators (arrows, particle trails)
  - Fixture discharge animations (water streaming out)
  - Camera controls (OrbitControls) for user navigation
  - Performance optimization for large networks (instancing, LOD)
  - Legend/UI overlay showing pressure ranges, flow rates, problematic areas

## Key Conventions

### ID Generation
- Use `createNodeId(prefix)` and `createLinkId(prefix)` from `src/shared/utils/id.ts` (nanoid-based)
- IDs follow pattern: `{prefix}_{6-char-nanoid}` (e.g., `fixture_sink_aBc123`)

### Catalog Items
- All placeable elements defined in `src/shared/constants/catalog.tsx`
- Each item has `element: 'node' | 'link'`, device type, defaults, and metadata
- To add new fixtures/pipes: extend `CATALOG_ITEMS` array with proper defaults matching EPANET requirements

### Units System
- Default: `ar` (Argentina - metric with L/s flow, kPa pressure)
- Unit conversion happens at display layer and INP export (`inpBuilder.ts`)
- Internal state always uses base SI units (meters, L/s, kPa)

### File Structure Patterns
- Modules are feature-based: `catalog`, `editor`, `simulation`, `storage`, `viewer3d`
- Shared code lives in `src/shared/{constants,state,types,utils}`
- No barrel exports - import directly from specific files

## Development Workflows

### Running the App
```bash
npm run dev  # Vite dev server on http://localhost:5173
npm run build  # TypeScript check + production build
```

### Testing Simulation
Import `examples/minimal-network.json` to test with a valid network (reservoir → tank → fixture with pipes). This ensures EPANET worker is functioning.

### Adding New Device Types
1. Define catalog item in `src/shared/constants/catalog.tsx` with all required EPANET properties
2. Ensure defaults include valid values (e.g., tank needs positive diameter, pipes need roughness coefficient)
3. Update `inpBuilder.ts` if new EPANET sections are needed
4. Add validation rules in `networkValidation.ts` if special constraints apply

### Debugging Simulation Errors
- Check browser console for worker errors
- Errors map through `simulationErrors.ts` to user-friendly messages
- Common issues: missing tank diameter, negative elevations, disconnected networks
- Enable EPANET report output by inspecting `network.inp` content in worker (add console.log before `workspace.writeFile`)

## Integration Points

### External Dependencies
- **epanet-js**: WASM port of OWA-EPANET 2.2 - immutable API, requires explicit `.inp` file format
- **idb-keyval**: IndexedDB wrapper for autosave (key: `hidrohome_autosave_v1`)
- **Mantine UI**: All components use Mantine (avoid mixing with other UI libs)
- **react-konva**: Canvas rendering - don't mix with vanilla canvas APIs
- **Three.js**: 3D rendering engine - currently sufficient for basic visualization
- **Recommended additions for flow animation:**
  - **@react-three/fiber**: React renderer for Three.js (more declarative, better React integration)
  - **@react-three/drei**: Useful helpers (OrbitControls, particles, effects)
  - **@react-three/postprocessing**: Optional - for advanced visual effects (bloom, depth of field)
  - Alternative: Keep vanilla Three.js but add particle system library or custom shaders for flow effects

### Data Flow: Canvas ↔ Store ↔ Worker
- Canvas events → store actions → state update → autosave trigger
- Simulation button → validation → worker postMessage → results → store → UI refresh
- No direct DOM manipulation - all visual updates flow through Zustand state

## Critical Patterns

### Error Handling
- Worker errors map to `SimulationErrorDetail` type with `title`, `description`, `solution` fields
- Use `notifications.show()` (Mantine) for user-facing messages
- Validation errors prevent simulation from starting (fail-fast approach)

### Performance
- Autosave debounces (500ms) to avoid excessive IndexedDB writes
- Large networks may slow canvas - consider virtualization if >500 nodes
- Worker isolation prevents main thread blocking during simulation

## What to Avoid
- Don't mutate state outside store actions
- Don't run EPANET on main thread (breaks UI)
- Don't add nodes/links without using catalog items (breaks INP export)
- Don't mix measurement units in calculations (always convert at boundaries)
- Don't skip network validation before simulation (EPANET crashes on invalid input)

## Documentation Standards

### UI/Layout Documentation
**Critical**: When making changes to the user interface or layout, you MUST update `docs/ui-architecture.md`. This file serves as the single source of truth for the application's visual structure and component organization.

**Update `docs/ui-architecture.md` when**:
- Adding, removing, or moving UI components
- Changing the AppShell structure (Header, Navbar, Aside, Main)
- Modifying component hierarchy or nesting
- Implementing features from the roadmap
- Discovering new UI/UX improvement opportunities
- Changing component props, positioning, or styling patterns

**Update process**:
1. Edit the "Estructura de Componentes Actual" section with the current state
2. Update ASCII diagrams if layout changes
3. Mark roadmap items as completed [x] when implemented
4. Add new roadmap items if identified during development
5. Update "Estado de Desarrollo" section
6. Commit with descriptive message: `docs: update ui-architecture with [specific change]`

**This ensures**:
- Future chat sessions have accurate context
- Team members understand the UI structure
- Design decisions are documented
- Roadmap progress is tracked systematically
