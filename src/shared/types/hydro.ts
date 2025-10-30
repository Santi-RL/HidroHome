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

export interface SimulationNodeResult {
  id: string;
  label: string;
  pressure: number;
  demand: number;
  head: number;
}

export interface SimulationLinkResult {
  id: string;
  label: string;
  flow: number;
  velocity: number;
  status: 'OPEN' | 'CLOSED';
  headloss: number;
}

export interface SimulationResults {
  generatedAt: string;
  summary: {
    maxPressure: number;
    minPressure: number;
    maxFlow: number;
  };
  nodes: SimulationNodeResult[];
  links: SimulationLinkResult[];
}

export interface HydroProjectFile {
  version: string;
  network: HydroNetwork;
  preferences: {
    unitSystem: UnitSystemId;
  };
}
