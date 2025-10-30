import type { HydroLink, HydroNetwork, HydroNode } from '../../shared/types/hydro';

const formatNumber = (value: number, decimals = 3) => Number(value).toFixed(decimals);

const toLps = (value: number) => value * 1000;

const buildOptionsSection = () => {
  const flowUnits = 'LPS';
  return [
    '[OPTIONS]',
    ` UNITS              ${flowUnits}`,
    ' HEADLOSS           H-W',
    ' HYDRAULIC          ACCURACY 0.001',
    ' UNBALANCED         CONTINUE 10',
    ' PATTERN            1',
    ' REPORT             YES',
    '',
  ].join('\n');
};

const buildReportSection = () =>
  ['[REPORT]', ' STATUS            YES', ' NODES             ALL', ' LINKS             ALL', ''].join('\n');

const isJunction = (node: HydroNode) => node.type === 'junction' || node.type === 'fixture';

const buildJunctions = (nodes: HydroNode[]) => {
  const lines = ['[JUNCTIONS]'];
  nodes
    .filter(isJunction)
    .forEach((node) => {
      lines.push(
        `${node.id} ${formatNumber(node.elevation, 3)} ${formatNumber(toLps(node.baseDemand), 4)}`,
      );
    });
  lines.push('');
  return lines.join('\n');
};

const buildReservoirs = (nodes: HydroNode[]) => {
  const reservoirs = nodes.filter((node) => node.type === 'reservoir' && node.reservoir);
  if (reservoirs.length === 0) {
    return '';
  }
  const lines = ['[RESERVOIRS]'];
  reservoirs.forEach((node) => {
    const head = node.reservoir?.head ?? node.elevation;
    lines.push(`${node.id} ${formatNumber(head, 3)}`);
  });
  lines.push('');
  return lines.join('\n');
};

const buildTanks = (nodes: HydroNode[]) => {
  const tanks = nodes.filter((node) => node.type === 'tank' && node.tank);
  if (tanks.length === 0) {
    return '';
  }
  const lines = ['[TANKS]'];
  tanks.forEach((node) => {
    const tank = node.tank!;
    const tankLine = [
      node.id,
      formatNumber(node.elevation, 3),
      formatNumber(tank.initLevel, 3),
      formatNumber(tank.minLevel, 3),
      formatNumber(tank.maxLevel, 3),
      formatNumber(tank.diameter, 3),
    ].join(' ');

    lines.push(tankLine);
  });
  lines.push('');
  return lines.join('\n');
};

const buildPipes = (links: HydroLink[]) => {
  const pipes = links.filter((link) => link.type === 'pipe');
  const pipeLines = ['[PIPES]'];
  pipes
    .filter((link) => link.type === 'pipe')
    .forEach((link) =>
      pipeLines.push(
        `${link.id} ${link.from} ${link.to} ${formatNumber(link.length, 3)} ${formatNumber(
          link.diameter,
          3,
        )} ${formatNumber(link.roughness, 3)} ${formatNumber(link.minorLoss, 3)} ${link.status}`,
      ),
    );
  pipeLines.push('');
  return pipeLines.join('\n');
};

const buildPumps = (links: HydroLink[]) => {
  const pumps = links.filter((link) => link.type === 'pump' && link.pump);
  if (pumps.length === 0) return '';
  const lines = ['[PUMPS]'];
  pumps.forEach((link) => {
    lines.push(`${link.id} ${link.from} ${link.to} POWER ${formatNumber(link.pump!.power, 3)}`);
  });
  lines.push('');
  return lines.join('\n');
};

const buildValves = (links: HydroLink[]) => {
  const valves = links.filter((link) => link.type === 'valve' && link.valve);
  if (valves.length === 0) return '';
  const lines = ['[VALVES]'];
  valves.forEach((link) => {
    const valve = link.valve!;
    lines.push(
      `${link.id} ${link.from} ${link.to} ${formatNumber(link.diameter, 3)} ${valve.valveType} ${formatNumber(
        valve.setting,
        3,
      )} ${formatNumber(valve.minorLoss, 3)}`,
    );
  });
  lines.push('');
  return lines.join('\n');
};

const buildCoordinates = (nodes: HydroNode[]) => {
  const lines = ['[COORDINATES]'];
  nodes.forEach((node) => {
    lines.push(`${node.id} ${formatNumber(node.position.x / 50, 2)} ${formatNumber(node.position.y / 50, 2)}`);
  });
  lines.push('');
  return lines.join('\n');
};

export const buildInpFromNetwork = (network: HydroNetwork): string => {
  const sections: string[] = [];
  sections.push(buildOptionsSection());
  sections.push(buildReportSection());
  sections.push(buildJunctions(network.nodes));
  const reservoirs = buildReservoirs(network.nodes);
  if (reservoirs) sections.push(reservoirs);
  const tanks = buildTanks(network.nodes);
  if (tanks) sections.push(tanks);
  sections.push(buildPipes(network.links));
  const pumps = buildPumps(network.links);
  if (pumps) sections.push(pumps);
  const valves = buildValves(network.links);
  if (valves) sections.push(valves);
  sections.push(buildCoordinates(network.nodes));
  sections.push('[END]');
  return sections.filter(Boolean).join('\n');
};
