import type { Vec2 } from './math';

export type UnitSystemId = 'ar' | 'metric' | 'imperial';

export interface UnitsConfig {
  label: string;
  length: 'm' | 'ft';
  diameter: 'mm' | 'in';
  flow: 'L/s' | 'gpm';
  pressure: 'kPa' | 'psi';
  roughness: 'C';
}

export const UNIT_SYSTEMS: Record<UnitSystemId, UnitsConfig> = {
  ar: {
    label: 'Argentina (Sistema Métrico)',
    length: 'm',
    diameter: 'mm',
    flow: 'L/s',
    pressure: 'kPa',
    roughness: 'C',
  },
  metric: {
    label: 'Métrico Internacional',
    length: 'm',
    diameter: 'mm',
    flow: 'L/s',
    pressure: 'kPa',
    roughness: 'C',
  },
  imperial: {
    label: 'Imperial (EE.UU.)',
    length: 'ft',
    diameter: 'in',
    flow: 'gpm',
    pressure: 'psi',
    roughness: 'C',
  },
};

export type NodeType = 'junction' | 'fixture' | 'tank' | 'reservoir';

export interface HydroNode {
  id: string;
  label: string;
  type: NodeType;
  position: Vec2;
  elevation: number;
  baseDemand: number;
  emitterCoeff?: number;
  tank?: {
    minLevel: number;
    maxLevel: number;
    diameter: number;
    initLevel: number;
  };
  reservoir?: {
    head: number;
  };
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export type LinkType = 'pipe' | 'pump' | 'valve';

export interface HydroLink {
  id: string;
  type: LinkType;
  from: string;
  to: string;
  length: number;
  diameter: number;
  roughness: number;
  minorLoss: number;
  status: 'OPEN' | 'CLOSED';
  pump?: {
    power: number;
  };
  valve?: {
    valveType: 'PRV' | 'PSV' | 'PBV' | 'FCV' | 'TCV';
    setting: number;
    minorLoss: number;
  };
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export interface HydroNetwork {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  units: UnitSystemId;
  notes?: string;
  nodes: HydroNode[];
  links: HydroLink[];
}

/**
 * Resultado instantáneo de un nodo en un timestep específico.
 */
export interface SimulationNodeResult {
  id: string;
  label: string;
  pressure: number;
  demand: number;
  head: number;
  /** Nivel del tanque (si aplica), en metros o pies según sistema de unidades */
  tankLevel?: number;
}

/**
 * Resultado instantáneo de un enlace en un timestep específico.
 */
export interface SimulationLinkResult {
  id: string;
  label: string;
  flow: number;
  velocity: number;
  status: 'OPEN' | 'CLOSED';
  headloss: number;
}

/**
 * Colección de resultados en un instante temporal específico.
 */
export interface SimulationTimestep {
  /** Tiempo transcurrido desde el inicio de la simulación en segundos */
  time: number;
  /** Resultados de todos los nodos en este timestep */
  nodes: SimulationNodeResult[];
  /** Resultados de todos los enlaces en este timestep */
  links: SimulationLinkResult[];
}

/**
 * Rangos globales min/max para escalar visualizaciones.
 */
export interface SimulationRanges {
  pressure: { min: number; max: number };
  flow: { min: number; max: number };
  velocity: { min: number; max: number };
  tankLevel?: { min: number; max: number };
}

/**
 * Resultados completos de una simulación hidráulica.
 * Incluye datos agregados (summary) y series temporales completas (timesteps).
 */
export interface SimulationResults {
  generatedAt: string;
  /** Duración total simulada en segundos */
  duration: number;
  /** Intervalo de reporte entre timesteps en segundos */
  reportStep: number;
  /** Resumen agregado para compatibilidad con UI existente */
  summary: {
    maxPressure: number;
    minPressure: number;
    maxFlow: number;
  };
  /** Rangos min/max globales para mapeo visual */
  ranges: SimulationRanges;
  /** Series temporales completas: array de estados en cada timestep */
  timesteps: SimulationTimestep[];
  /** 
   * Vista instantánea del último timestep para compatibilidad retroactiva.
   * @deprecated Usar timesteps[timesteps.length - 1] en su lugar.
   */
  nodes: SimulationNodeResult[];
  /**
   * Vista instantánea del último timestep para compatibilidad retroactiva.
   * @deprecated Usar timesteps[timesteps.length - 1] en su lugar.
   */
  links: SimulationLinkResult[];
}

export interface HydroProjectFile {
  version: string;
  network: HydroNetwork;
  preferences: {
    unitSystem: UnitSystemId;
  };
}
