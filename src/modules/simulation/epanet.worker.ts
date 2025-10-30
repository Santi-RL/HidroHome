import { Project, Workspace, NodeProperty, LinkProperty } from 'epanet-js';
import type {
  HydroNetwork,
  SimulationResults,
  SimulationLinkResult,
} from '../../shared/types/hydro';
import { buildInpFromNetwork } from './inpBuilder';

interface WorkerRequest {
  type: 'run';
  payload: {
    network: HydroNetwork;
  };
}

interface WorkerSuccessResponse {
  type: 'success';
  payload: SimulationResults;
}

interface WorkerErrorResponse {
  type: 'error';
  error: string;
}

const ctx: Worker = self as unknown as Worker;

const runSimulation = (network: HydroNetwork): SimulationResults => {
  const workspace = new Workspace();
  const project = new Project(workspace);

  const inpContent = buildInpFromNetwork(network);
  workspace.writeFile('network.inp', inpContent);
  project.open('network.inp', 'report.rpt', 'out.bin');
  project.solveH();

  const nodeResults = network.nodes.map((node) => {
    const index = project.getNodeIndex(node.id);
    const pressure = project.getNodeValue(index, NodeProperty.Pressure);
    const demand = project.getNodeValue(index, NodeProperty.Demand);
    const head = project.getNodeValue(index, NodeProperty.Head);
    return {
      id: node.id,
      label: node.label,
      pressure,
      demand,
      head,
    };
  });

  const linkResults: SimulationLinkResult[] = network.links.map((link) => {
    const index = project.getLinkIndex(link.id);
    const flow = project.getLinkValue(index, LinkProperty.Flow);
    const velocity = project.getLinkValue(index, LinkProperty.Velocity);
    const headloss = project.getLinkValue(index, LinkProperty.Headloss);
    const statusValue = project.getLinkValue(index, LinkProperty.Status);
    const status: 'OPEN' | 'CLOSED' = statusValue > 0 ? 'OPEN' : 'CLOSED';
    return {
      id: link.id,
      label: link.deviceId ?? link.id,
      flow,
      velocity,
      headloss,
      status,
    };
  });

  project.close();

  const pressures = nodeResults.map((node) => node.pressure);
  const flows = linkResults.map((link) => link.flow);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      maxPressure: Math.max(...pressures, 0),
      minPressure: pressures.length > 0 ? Math.min(...pressures) : 0,
      maxFlow: flows.length > 0 ? Math.max(...flows) : 0,
    },
    nodes: nodeResults,
    links: linkResults,
  };
};

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;
  if (data.type !== 'run') return;

  try {
    const results = runSimulation(data.payload.network);
    const response: WorkerSuccessResponse = {
      type: 'success',
      payload: results,
    };
    ctx.postMessage(response);
  } catch (error) {
    console.error('EPANET worker error', error);
    const response: WorkerErrorResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido al simular.',
    };
    ctx.postMessage(response);
  }
});

export {};
