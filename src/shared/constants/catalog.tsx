import type { TablerIcon } from '@tabler/icons-react';
import {
  IconAdjustmentsBolt,
  IconBath,
  IconBuildingFactory,
  IconDropletBolt,
  IconEngine,
  IconTank,
  IconTestPipe,
  IconToiletPaper,
  IconTopologyStar3,
  IconWashMachine,
  IconCup,
} from '@tabler/icons-react';
import type { HydroLink, HydroNode, LinkType, NodeType } from '../types/hydro';

export type CatalogCategory =
  | 'accesorios'
  | 'piping'
  | 'control'
  | 'energia'
  | 'almacenamiento'
  | 'otros';

interface CatalogBaseItem {
  id: string;
  name: string;
  description: string;
  category: CatalogCategory;
  icon: TablerIcon;
  color: string;
}

export interface CatalogNodeItem extends CatalogBaseItem {
  element: 'node';
  nodeType: NodeType;
  defaults: Pick<
    HydroNode,
    'label' | 'type' | 'baseDemand' | 'elevation' | 'tank' | 'reservoir'
  > & { footprint: { width: number; height: number } };
}

export interface CatalogLinkItem extends CatalogBaseItem {
  element: 'link';
  linkType: LinkType;
  defaults: Pick<
    HydroLink,
    | 'length'
    | 'diameter'
    | 'roughness'
    | 'minorLoss'
    | 'status'
    | 'pump'
    | 'valve'
  >;
}

export type CatalogItem = CatalogNodeItem | CatalogLinkItem;

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'fixture_sink',
    element: 'node',
    nodeType: 'fixture',
    name: 'Lavatorio',
    description: 'Punto de consumo tipico de bano o cocina.',
    category: 'accesorios',
    icon: IconCup,
    color: '#0ea5e9',
    defaults: {
      label: 'Lavatorio',
      type: 'fixture',
      baseDemand: 0.00018,
      elevation: 0.0,
      footprint: { width: 60, height: 40 },
    },
  },
  {
    id: 'fixture_toilet',
    element: 'node',
    nodeType: 'fixture',
    name: 'Inodoro',
    description: 'Descarga sanitaria.',
    category: 'accesorios',
    icon: IconToiletPaper,
    color: '#ef4444',
    defaults: {
      label: 'Inodoro',
      type: 'fixture',
      baseDemand: 0.00025,
      elevation: 0.0,
      footprint: { width: 50, height: 50 },
    },
  },
  {
    id: 'fixture_shower',
    element: 'node',
    nodeType: 'fixture',
    name: 'Ducha',
    description: 'Punto de consumo continuo.',
    category: 'accesorios',
    icon: IconBath,
    color: '#22c55e',
    defaults: {
      label: 'Ducha',
      type: 'fixture',
      baseDemand: 0.0003,
      elevation: 0.0,
      footprint: { width: 40, height: 40 },
    },
  },
  {
    id: 'fixture_washer',
    element: 'node',
    nodeType: 'fixture',
    name: 'Lavarropas',
    description: 'Electrodomestico de alta demanda.',
    category: 'accesorios',
    icon: IconWashMachine,
    color: '#f97316',
    defaults: {
      label: 'Lavarropas',
      type: 'fixture',
      baseDemand: 0.00035,
      elevation: 0.0,
      footprint: { width: 70, height: 50 },
    },
  },
  {
    id: 'junction',
    element: 'node',
    nodeType: 'junction',
    name: 'Conexion',
    description: 'Nudo de distribucion sin consumo.',
    category: 'piping',
    icon: IconTopologyStar3,
    color: '#6366f1',
    defaults: {
      label: 'Juncion',
      type: 'junction',
      baseDemand: 0,
      elevation: 0.0,
      footprint: { width: 30, height: 30 },
    },
  },
  {
    id: 'storage_tank',
    element: 'node',
    nodeType: 'tank',
    name: 'Tanque elevado',
    description: 'Tanque de almacenamiento principal.',
    category: 'almacenamiento',
    icon: IconTank,
    color: '#1d4ed8',
    defaults: {
      label: 'Tanque',
      type: 'tank',
      baseDemand: 0,
      elevation: 5,
      tank: {
        minLevel: 0.5,
        maxLevel: 3.5,
        diameter: 2,
        initLevel: 2,
      },
      footprint: { width: 80, height: 80 },
    },
  },
  {
    id: 'source_reservoir',
    element: 'node',
    nodeType: 'reservoir',
    name: 'Reservorio',
    description: 'Fuente principal del sistema.',
    category: 'almacenamiento',
    icon: IconBuildingFactory,
    color: '#155e75',
    defaults: {
      label: 'Reservorio',
      type: 'reservoir',
      baseDemand: 0,
      elevation: 0,
      reservoir: {
        head: 10,
      },
      footprint: { width: 80, height: 80 },
    },
  },
  {
    id: 'pipe_pvc_25',
    element: 'link',
    linkType: 'pipe',
    name: 'Cano PVC 25',
    description: 'Tuberia PVC diametro nominal 25 mm.',
    category: 'piping',
    icon: IconTestPipe,
    color: '#0f766e',
    defaults: {
      length: 2,
      diameter: 25,
      roughness: 145,
      minorLoss: 0,
      status: 'OPEN',
    },
  },
  {
    id: 'pipe_pvc_40',
    element: 'link',
    linkType: 'pipe',
    name: 'Cano PVC 40',
    description: 'Tuberia PVC diametro nominal 40 mm.',
    category: 'piping',
    icon: IconTestPipe,
    color: '#0f766e',
    defaults: {
      length: 2,
      diameter: 40,
      roughness: 150,
      minorLoss: 0,
      status: 'OPEN',
    },
  },
  {
    id: 'pipe_copper_20',
    element: 'link',
    linkType: 'pipe',
    name: 'Cano cobre 20',
    description: 'Tuberia de cobre para agua caliente.',
    category: 'piping',
    icon: IconTestPipe,
    color: '#b45309',
    defaults: {
      length: 2,
      diameter: 20,
      roughness: 120,
      minorLoss: 0,
      status: 'OPEN',
    },
  },
  {
    id: 'pump_standard',
    element: 'link',
    linkType: 'pump',
    name: 'Bomba centrifuga',
    description: 'Bomba electrica de uso domiciliario.',
    category: 'energia',
    icon: IconEngine,
    color: '#a855f7',
    defaults: {
      length: 0,
      diameter: 40,
      roughness: 110,
      minorLoss: 0,
      status: 'OPEN',
      pump: {
        power: 1.5,
      },
    },
  },
  {
    id: 'valve_prv',
    element: 'link',
    linkType: 'valve',
    name: 'Valvula reductora',
    description: 'Reduce la presion aguas abajo.',
    category: 'control',
    icon: IconAdjustmentsBolt,
    color: '#f43f5e',
    defaults: {
      length: 0.2,
      diameter: 25,
      roughness: 110,
      minorLoss: 0.1,
      status: 'OPEN',
      valve: {
        valveType: 'PRV',
        setting: 300,
        minorLoss: 0.1,
      },
    },
  },
  {
    id: 'valve_corte',
    element: 'link',
    linkType: 'valve',
    name: 'Valvula de corte',
    description: 'Cierra la linea.',
    category: 'control',
    icon: IconDropletBolt,
    color: '#0f172a',
    defaults: {
      length: 0.2,
      diameter: 25,
      roughness: 110,
      minorLoss: 0.2,
      status: 'CLOSED',
      valve: {
        valveType: 'TCV',
        setting: 0,
        minorLoss: 0.2,
      },
    },
  },
];

export const getCatalogItem = (id: string): CatalogItem | undefined =>
  CATALOG_ITEMS.find((item) => item.id === id);

export const CATALOG_SECTIONS: Record<CatalogCategory, CatalogItem[]> = CATALOG_ITEMS.reduce(
  (acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  },
  {} as Record<CatalogCategory, CatalogItem[]>,
);
