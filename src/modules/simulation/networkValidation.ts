import type { HydroLink, HydroNetwork, HydroNode } from '../../shared/types/hydro';
import type { SimulationErrorDetail } from '../../shared/types/simulation';

const SUPPLY_TYPES: HydroNode['type'][] = ['tank', 'reservoir'];
const DEMAND_TYPES: HydroNode['type'][] = ['junction', 'fixture'];

const formatNames = (items: { label: string; id: string }[]) =>
  items
    .map((item) => item.label || item.id)
    .filter(Boolean)
    .join(', ');

const createIssue = (
  code: string,
  title: string,
  description: string,
  solution: string,
): SimulationErrorDetail => ({
  code,
  title,
  description,
  solution,
});

const hasPositive = (value: number | undefined | null) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const hasNonNegative = (value: number | undefined | null) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const collectNodeDegrees = (network: HydroNetwork) => {
  const degrees = new Map<string, number>();
  network.nodes.forEach((node) => degrees.set(node.id, 0));

  network.links.forEach((link) => {
    if (degrees.has(link.from)) {
      degrees.set(link.from, (degrees.get(link.from) ?? 0) + 1);
    }
    if (degrees.has(link.to)) {
      degrees.set(link.to, (degrees.get(link.to) ?? 0) + 1);
    }
  });

  return degrees;
};

const findDisconnectedNodes = (network: HydroNetwork, supplyIds: string[]) => {
  if (supplyIds.length === 0) return new Set<string>();

  const adjacency = new Map<string, Set<string>>();
  network.nodes.forEach((node) => adjacency.set(node.id, new Set<string>()));

  network.links.forEach((link) => {
    if (!adjacency.has(link.from) || !adjacency.has(link.to)) {
      return;
    }
    adjacency.get(link.from)!.add(link.to);
    adjacency.get(link.to)!.add(link.from);
  });

  const visited = new Set<string>();
  const queue: string[] = [...supplyIds];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbours = adjacency.get(current);
    if (!neighbours) continue;
    neighbours.forEach((next) => {
      if (!visited.has(next)) {
        queue.push(next);
      }
    });
  }

  const disconnected = new Set<string>();
  network.nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      disconnected.add(node.id);
    }
  });

  return disconnected;
};

const validatePipes = (links: HydroLink[], issues: SimulationErrorDetail[]) => {
  const invalid = links.filter(
    (link) =>
      link.type === 'pipe' &&
      (!hasPositive(link.length) || !hasPositive(link.diameter) || !hasPositive(link.roughness)),
  );
  if (invalid.length > 0) {
    issues.push(
      createIssue(
        'PIPE_DIMENSIONS',
        'Hay tuberias con dimensiones invalidas',
        'Existen tuberias con longitud, diametro o rugosidad igual o menor a cero.',
        'Edita las tuberias indicadas para asegurarte de que longitud, diametro y rugosidad sean mayores a cero.',
      ),
    );
  }
};

const validatePumps = (links: HydroLink[], issues: SimulationErrorDetail[]) => {
  const invalid = links.filter(
    (link) => link.type === 'pump' && (!link.pump || !hasPositive(link.pump.power)),
  );
  if (invalid.length > 0) {
    issues.push(
      createIssue(
        'PUMP_POWER',
        'Bombas sin potencia definida',
        'Hay bombas sin potencia configurada o con potencia menor o igual a cero.',
        'Selecciona cada bomba y asigna una potencia positiva en sus propiedades.',
      ),
    );
  }
};

const validateValves = (links: HydroLink[], issues: SimulationErrorDetail[]) => {
  const invalid = links.filter(
    (link) =>
      link.type === 'valve' &&
      (!link.valve || !hasPositive(link.diameter) || !hasNonNegative(link.valve.setting)),
  );
  if (invalid.length > 0) {
    issues.push(
      createIssue(
        'VALVE_CONFIGURATION',
        'Valvulas con configuracion incompleta',
        'Se encontraron valvulas sin tipo, diametro o ajuste correctamente definidos.',
        'Revisa cada valvula para confirmar su diametro y el valor de ajuste correspondiente.',
      ),
    );
  }
};

const validateNodeDemands = (nodes: HydroNode[], issues: SimulationErrorDetail[]) => {
  const fixturesWithoutDemand = nodes.filter(
    (node) => node.type === 'fixture' && (!hasPositive(node.baseDemand) || node.baseDemand === 0),
  );
  if (fixturesWithoutDemand.length > 0) {
    issues.push(
      createIssue(
        'FIXTURE_DEMAND',
        'Puntos de consumo sin demanda',
        'Hay artefactos con demanda base igual o menor a cero, lo que impide calcular caudales.',
        'Edita la demanda de cada punto de consumo para asignar un caudal base positivo.',
      ),
    );
  }
};

const validateTanks = (nodes: HydroNode[], issues: SimulationErrorDetail[]) => {
  const invalid = nodes.filter((node) => {
    if (node.type !== 'tank') return false;
    const tank = node.tank;
    if (!tank) return true;
    if (!hasPositive(tank.diameter)) return true;
    if (!hasNonNegative(tank.minLevel) || !hasNonNegative(tank.maxLevel)) return true;
    if (tank.maxLevel <= tank.minLevel) return true;
    if (!hasNonNegative(tank.initLevel)) return true;
    return tank.initLevel < tank.minLevel || tank.initLevel > tank.maxLevel;
  });

  if (invalid.length > 0) {
    issues.push(
      createIssue(
        'TANK_SETUP',
        'Tanques con datos inconsistentes',
        'Uno o mas tanques no tienen niveles o diametro validos definidos.',
        'Configura niveles minimo, maximo y nivel inicial dentro de un rango logico y asigna un diametro positivo.',
      ),
    );
  }
};

const validateReservoirs = (nodes: HydroNode[], issues: SimulationErrorDetail[]) => {
  const invalid = nodes.filter((node) => node.type === 'reservoir' && !hasPositive(node.reservoir?.head));
  if (invalid.length > 0) {
    issues.push(
      createIssue(
        'RESERVOIR_HEAD',
        'Reservorios sin cota de carga',
        'Se detectaron reservorios sin altura de carga definida.',
        'Completa el valor de altura (head) para cada reservorio.',
      ),
    );
  }
};

export const validateNetworkForSimulation = (network: HydroNetwork): SimulationErrorDetail[] => {
  const issues: SimulationErrorDetail[] = [];

  if (!network.nodes.length) {
    issues.push(
      createIssue(
        'NO_NODES',
        'El proyecto no tiene elementos para simular',
        'La red hidraulica no contiene nodos ni artefactos.',
        'Agrega nodos (tanques, reservorios, conexiones o artefactos) antes de ejecutar la simulacion.',
      ),
    );
    return issues;
  }

  if (!network.links.length) {
    issues.push(
      createIssue(
        'NO_LINKS',
        'No hay conexiones entre los nodos',
        'La red no tiene tuberias, bombas o valvulas que unan los nodos.',
        'Conecta los nodos mediante tuberias u otros vinculos para definir el recorrido del agua.',
      ),
    );
  }

  const supplyNodes = network.nodes.filter((node) => SUPPLY_TYPES.includes(node.type));
  if (supplyNodes.length === 0) {
    issues.push(
      createIssue(
        'NO_SUPPLY',
        'La simulacion necesita una fuente de agua',
        'No se encontro ningun tanque o reservorio en la red.',
        'Agrega al menos un tanque o reservorio y conectalo con el resto del sistema.',
      ),
    );
  }

  const demandNodes = network.nodes.filter(
    (node) => DEMAND_TYPES.includes(node.type) && hasPositive(node.baseDemand),
  );
  if (demandNodes.length === 0) {
    issues.push(
      createIssue(
        'NO_DEMAND',
        'No hay puntos de consumo definidos',
        'La red no tiene nodos con demanda de agua para calcular caudales.',
        'Agrega artefactos o junciones con demanda positiva para representar el consumo.',
      ),
    );
  }

  const nodeIds = new Set(network.nodes.map((node) => node.id));
  const missingConnections: string[] = [];
  const selfConnectedLinks: string[] = [];

  network.links.forEach((link) => {
    if (!nodeIds.has(link.from) || !nodeIds.has(link.to)) {
      missingConnections.push(link.id);
    }
    if (link.from === link.to) {
      selfConnectedLinks.push(link.id);
    }
  });

  if (missingConnections.length > 0) {
    issues.push(
      createIssue(
        'LINK_NODE_REFERENCE',
        'Conexiones con nodos inexistentes',
        'Hay conexiones que apuntan a nodos eliminados o inexistentes.',
        'Vuelve a crear las conexiones afectadas seleccionando nodos validos en ambos extremos.',
      ),
    );
  }

  if (selfConnectedLinks.length > 0) {
    issues.push(
      createIssue(
        'LINK_SELF_REFERENCE',
        'Conexiones con el mismo nodo en ambos extremos',
        'Se detectaron enlaces que se conectan a si mismos.',
        'Elimina esas conexiones y vuelve a dibujarlas entre nodos distintos.',
      ),
    );
  }

  validatePipes(network.links, issues);
  validatePumps(network.links, issues);
  validateValves(network.links, issues);
  validateNodeDemands(network.nodes, issues);
  validateTanks(network.nodes, issues);
  validateReservoirs(network.nodes, issues);

  const degrees = collectNodeDegrees(network);
  const isolatedNodes = network.nodes.filter((node) => (degrees.get(node.id) ?? 0) === 0);
  if (isolatedNodes.length > 0) {
    issues.push(
      createIssue(
        'ISOLATED_NODES',
        'Hay nodos sin conexiones',
        `Los siguientes nodos estan aislados: ${formatNames(isolatedNodes)}.`,
        'Conecta cada nodo mediante al menos una tuberia, valvula o bomba o eliminarlos si no se utilizan.',
      ),
    );
  }

  if (supplyNodes.length > 0) {
    const supplyIds = supplyNodes.map((node) => node.id);
    const disconnected = findDisconnectedNodes(network, supplyIds);
    if (disconnected.size > 0) {
      const disconnectedNodes = network.nodes.filter((node) => disconnected.has(node.id));
      issues.push(
        createIssue(
          'DISCONNECTED_SUBNETWORK',
          'Existen sectores sin alimentacion desde la fuente',
          `Los siguientes nodos no tienen un camino desde una fuente de agua: ${formatNames(disconnectedNodes)}.`,
          'Revisa el trazado para garantizar que todos los nodos tengan una ruta continua hacia un tanque o reservorio.',
        ),
      );
    }

    const unreachableDemands = demandNodes.filter((node) => disconnected.has(node.id));
    if (unreachableDemands.length > 0) {
      issues.push(
        createIssue(
          'DEMAND_WITHOUT_SUPPLY',
          'Puntos de consumo sin acceso a la fuente',
          `Los siguientes consumos no estan conectados a un tanque o reservorio: ${formatNames(unreachableDemands)}.`,
          'Vincula cada artefacto con la red principal para que reciba agua.',
        ),
      );
    }
  }

  return issues;
};
