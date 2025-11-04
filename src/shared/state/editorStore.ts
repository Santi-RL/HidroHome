import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCatalogItem } from '../constants/catalog';
import type {
  HydroLink,
  HydroNetwork,
  HydroNode,
  SimulationResults,
  UnitSystemId,
} from '../types/hydro';
import type { SimulationErrorDetail } from '../types/simulation';
import type { Vec2 } from '../types/math';
import { distanceVec2 } from '../types/math';
import { createLinkId, createNodeId } from '../utils/id';

type EditorTool = 'select' | 'connect';

type Selection =
  | { type: 'node'; id: string }
  | { type: 'link'; id: string }
  | null;

type ViewMode = '2d' | '3d';

interface SimulationState {
  status: 'idle' | 'running' | 'success' | 'error';
  results?: SimulationResults;
  error?: SimulationErrorDetail[];
  /** Índice del timestep actualmente visible/seleccionado para animación (0-based) */
  currentTimestepIndex: number;
  /** Estado de reproducción de la animación */
  isPlaying: boolean;
  /** Velocidad de reproducción (multiplicador, 1.0 = tiempo real) */
  playbackSpeed: number;
}

interface EditorState {
  network: HydroNetwork;
  selection: Selection;
  activeTool: EditorTool;
  activeLinkTemplateId: string | null;
  linkStartNodeId: string | null;
  unitSystem: UnitSystemId;
  isDirty: boolean;
  simulation: SimulationState;
  viewMode: ViewMode;
  addNode: (itemId: string, position: Vec2) => void;
  updateNodePosition: (nodeId: string, position: Vec2) => void;
  updateNode: (nodeId: string, changes: Partial<HydroNode>) => void;
  addLinkBetween: (itemId: string, fromNodeId: string, toNodeId: string) => void;
  updateLink: (linkId: string, changes: Partial<HydroLink>) => void;
  selectNode: (nodeId: string) => void;
  selectLink: (linkId: string) => void;
  clearSelection: () => void;
  removeSelected: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveLinkTemplate: (itemId: string | null) => void;
  setLinkStartNode: (nodeId: string | null) => void;
  completeLinkTo: (nodeId: string) => void;
  setUnitSystem: (unit: UnitSystemId) => void;
  setNetworkName: (name: string) => void;
  loadNetwork: (network: HydroNetwork) => void;
  setSimulationStatus: (status: SimulationState['status']) => void;
  setSimulationResults: (results: SimulationResults) => void;
  setSimulationError: (details: SimulationErrorDetail[] | SimulationErrorDetail) => void;
  resetSimulation: () => void;
  markSaved: () => void;
  setViewMode: (mode: ViewMode) => void;
  /** Establecer el índice del timestep activo */
  setCurrentTimestep: (index: number) => void;
  /** Avanzar al siguiente timestep */
  nextTimestep: () => void;
  /** Retroceder al timestep anterior */
  previousTimestep: () => void;
  /** Iniciar/pausar la reproducción de la animación */
  togglePlayback: () => void;
  /** Establecer la velocidad de reproducción */
  setPlaybackSpeed: (speed: number) => void;
}

const nowIso = () => new Date().toISOString();

const createEmptyNetwork = (): HydroNetwork => ({
  id: `network_${Date.now()}`,
  name: 'Proyecto sin titulo',
  description: '',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  units: 'ar',
  nodes: [],
  links: [],
});

const createDefaultSimulationState = (): SimulationState => ({
  status: 'idle',
  currentTimestepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1.0,
});

const updateTimestamp = (network: HydroNetwork): HydroNetwork => ({
  ...network,
  updatedAt: nowIso(),
});

const withUpdatedNode = (
  nodes: HydroNode[],
  nodeId: string,
  updater: (current: HydroNode) => HydroNode,
): HydroNode[] =>
  nodes.map((node) => (node.id === nodeId ? updater(node) : node));

const withUpdatedLink = (
  links: HydroLink[],
  linkId: string,
  updater: (current: HydroLink) => HydroLink,
): HydroLink[] =>
  links.map((link) => (link.id === linkId ? updater(link) : link));

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      network: createEmptyNetwork(),
      selection: null,
      activeTool: 'select',
      activeLinkTemplateId: null,
      linkStartNodeId: null,
      unitSystem: 'ar',
      isDirty: false,
      simulation: createDefaultSimulationState(),
      viewMode: '2d',

      addNode: (itemId, position) => {
        const item = getCatalogItem(itemId);
        if (!item || item.element !== 'node') return;

        const newNode: HydroNode = {
          id: createNodeId(item.id),
          label: item.defaults.label,
          type: item.nodeType,
          position,
          elevation: item.defaults.elevation,
          baseDemand: item.defaults.baseDemand,
          emitterCoeff: 0,
          tank: item.defaults.tank,
          reservoir: item.defaults.reservoir,
          deviceId: item.id,
        };

        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            nodes: [...state.network.nodes, newNode],
          }),
          selection: { type: 'node', id: newNode.id },
          isDirty: true,
        }));
      },

      updateNodePosition: (nodeId, position) => {
        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            nodes: withUpdatedNode(state.network.nodes, nodeId, (node) => ({
              ...node,
              position,
            })),
          }),
          isDirty: true,
        }));
      },

      updateNode: (nodeId, changes) => {
        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            nodes: withUpdatedNode(state.network.nodes, nodeId, (node) => ({
              ...node,
              ...changes,
            })),
          }),
          isDirty: true,
        }));
      },

      addLinkBetween: (itemId, fromNodeId, toNodeId) => {
        const item = getCatalogItem(itemId);
        if (!item || item.element !== 'link') return;

        const { network } = get();
        const fromNode = network.nodes.find((node) => node.id === fromNodeId);
        const toNode = network.nodes.find((node) => node.id === toNodeId);

        if (!fromNode || !toNode) return;

        const distance = distanceVec2(fromNode.position, toNode.position);
        const scaledLength = distance > 0 ? distance / 50 : 0;
        const defaults = item.defaults;

        const newLink: HydroLink = {
          id: createLinkId(item.id),
          type: item.linkType,
          from: fromNodeId,
          to: toNodeId,
          length:
            defaults.length && defaults.length > 0
              ? defaults.length
              : Math.max(Number(scaledLength.toFixed(2)), 0.5),
          diameter: defaults.diameter,
          roughness: defaults.roughness,
          minorLoss: defaults.minorLoss,
          status: defaults.status,
          pump: defaults.pump,
          valve: defaults.valve,
          deviceId: item.id,
        };

        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            links: [...state.network.links, newLink],
          }),
          selection: { type: 'link', id: newLink.id },
          isDirty: true,
          activeTool: 'select',
          activeLinkTemplateId: null,
          linkStartNodeId: null,
        }));
      },

      updateLink: (linkId, changes) => {
        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            links: withUpdatedLink(state.network.links, linkId, (link) => ({
              ...link,
              ...changes,
              pump: changes.pump ?? link.pump,
              valve: changes.valve ?? link.valve,
            })),
          }),
          isDirty: true,
        }));
      },

      selectNode: (nodeId) => set({ selection: { type: 'node', id: nodeId } }),
      selectLink: (linkId) => set({ selection: { type: 'link', id: linkId } }),

      clearSelection: () => set({ selection: null }),

      removeSelected: () => {
        const { selection } = get();
        if (!selection) return;

        if (selection.type === 'node') {
          set((state) => ({
            network: updateTimestamp({
              ...state.network,
              nodes: state.network.nodes.filter((node) => node.id !== selection.id),
              links: state.network.links.filter(
                (link) => link.from !== selection.id && link.to !== selection.id,
              ),
            }),
            selection: null,
            isDirty: true,
          }));
        } else if (selection.type === 'link') {
          set((state) => ({
            network: updateTimestamp({
              ...state.network,
              links: state.network.links.filter((link) => link.id !== selection.id),
            }),
            selection: null,
            isDirty: true,
          }));
        }
      },

      setActiveTool: (tool) =>
        set({
          activeTool: tool,
          linkStartNodeId: tool === 'select' ? null : get().linkStartNodeId,
        }),

      setActiveLinkTemplate: (itemId) =>
        set({
          activeTool: itemId ? 'connect' : 'select',
          activeLinkTemplateId: itemId,
          linkStartNodeId: null,
        }),

      setLinkStartNode: (nodeId) => set({ linkStartNodeId: nodeId }),

      completeLinkTo: (nodeId) => {
        const { activeLinkTemplateId, linkStartNodeId } = get();
        if (!activeLinkTemplateId || !linkStartNodeId || linkStartNodeId === nodeId) {
          return;
        }
        get().addLinkBetween(activeLinkTemplateId, linkStartNodeId, nodeId);
      },

      setUnitSystem: (unit) =>
        set((state) => ({
          unitSystem: unit,
          network: {
            ...state.network,
            units: unit,
            updatedAt: nowIso(),
          },
          isDirty: true,
        })),

      setNetworkName: (name) =>
        set((state) => ({
          network: updateTimestamp({
            ...state.network,
            name,
          }),
          isDirty: true,
        })),

      loadNetwork: (network) =>
        set({
          network,
          selection: null,
          activeTool: 'select',
          activeLinkTemplateId: null,
          linkStartNodeId: null,
          unitSystem: network.units,
          isDirty: false,
          simulation: createDefaultSimulationState(),
        }),

      setSimulationStatus: (status) =>
        set((state) => ({
          simulation: {
            ...state.simulation,
            status,
            ...(status !== 'error' ? { error: undefined } : {}),
          },
        })),

      setSimulationResults: (results) =>
        set({
          simulation: {
            status: 'success',
            results,
            error: undefined,
            currentTimestepIndex: 0,
            isPlaying: false,
            playbackSpeed: 1.0,
          },
        }),

      setSimulationError: (details) => {
        const normalized = Array.isArray(details) ? details : [details];
        set({
          simulation: {
            status: 'error',
            error: normalized,
            currentTimestepIndex: 0,
            isPlaying: false,
            playbackSpeed: 1.0,
          },
        });
      },

      resetSimulation: () => set({ simulation: createDefaultSimulationState() }),

      markSaved: () => set({ isDirty: false }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setCurrentTimestep: (index) =>
        set((state) => {
          const maxIndex = state.simulation.results?.timesteps.length
            ? state.simulation.results.timesteps.length - 1
            : 0;
          const clampedIndex = Math.max(0, Math.min(index, maxIndex));
          return {
            simulation: {
              ...state.simulation,
              currentTimestepIndex: clampedIndex,
            },
          };
        }),

      nextTimestep: () =>
        set((state) => {
          const maxIndex = state.simulation.results?.timesteps.length
            ? state.simulation.results.timesteps.length - 1
            : 0;
          const nextIndex = Math.min(state.simulation.currentTimestepIndex + 1, maxIndex);
          return {
            simulation: {
              ...state.simulation,
              currentTimestepIndex: nextIndex,
            },
          };
        }),

      previousTimestep: () =>
        set((state) => {
          const prevIndex = Math.max(state.simulation.currentTimestepIndex - 1, 0);
          return {
            simulation: {
              ...state.simulation,
              currentTimestepIndex: prevIndex,
            },
          };
        }),

      togglePlayback: () =>
        set((state) => ({
          simulation: {
            ...state.simulation,
            isPlaying: !state.simulation.isPlaying,
          },
        })),

      setPlaybackSpeed: (speed) =>
        set((state) => ({
          simulation: {
            ...state.simulation,
            playbackSpeed: Math.max(0.1, Math.min(speed, 10.0)),
          },
        })),
    }),
    {
      name: 'hidrohome-editor-store',
      partialize: (state) => ({
        network: state.network,
        unitSystem: state.unitSystem,
        viewMode: state.viewMode,
      }),
    },
  ),
);

export const useNetwork = () => useEditorStore((state) => state.network);
export const useSelection = () => useEditorStore((state) => state.selection);
export const useSimulationState = () => useEditorStore((state) => state.simulation);
export const useUnitSystem = () => useEditorStore((state) => state.unitSystem);
export const useIsDirty = () => useEditorStore((state) => state.isDirty);
export const useActiveLinkTemplateId = () =>
  useEditorStore((state) => state.activeLinkTemplateId);
export const useLinkStartNodeId = () => useEditorStore((state) => state.linkStartNodeId);
export const useActiveTool = () => useEditorStore((state) => state.activeTool);
export const useViewMode = () => useEditorStore((state) => state.viewMode);

/**
 * Hook para obtener el timestep actual y sus datos asociados.
 */
export const useCurrentTimestep = () =>
  useEditorStore((state) => {
    const { simulation } = state;
    if (!simulation.results?.timesteps.length) {
      return null;
    }
    return simulation.results.timesteps[simulation.currentTimestepIndex];
  });

/**
 * Hook para obtener los rangos globales de la simulación.
 */
export const useSimulationRanges = () =>
  useEditorStore((state) => state.simulation.results?.ranges);

/**
 * Hook para obtener el estado de reproducción (sin acciones).
 */
export const usePlaybackState = () => {
  const currentIndex = useEditorStore((state) => state.simulation.currentTimestepIndex);
  const isPlaying = useEditorStore((state) => state.simulation.isPlaying);
  const playbackSpeed = useEditorStore((state) => state.simulation.playbackSpeed);
  const totalTimesteps = useEditorStore(
    (state) => state.simulation.results?.timesteps.length ?? 0,
  );

  return { currentIndex, isPlaying, playbackSpeed, totalTimesteps };
};

/**
 * Hook para obtener las acciones de reproducción (estables).
 */
export const usePlaybackActions = () => {
  const setCurrentTimestep = useEditorStore((state) => state.setCurrentTimestep);
  const nextTimestep = useEditorStore((state) => state.nextTimestep);
  const previousTimestep = useEditorStore((state) => state.previousTimestep);
  const togglePlayback = useEditorStore((state) => state.togglePlayback);
  const setPlaybackSpeed = useEditorStore((state) => state.setPlaybackSpeed);

  return {
    setCurrentTimestep,
    nextTimestep,
    previousTimestep,
    togglePlayback,
    setPlaybackSpeed,
  };
};
