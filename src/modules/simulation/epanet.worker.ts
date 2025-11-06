import {
  Project,
  Workspace,
  NodeProperty,
  LinkProperty,
  InitHydOption,
  TimeParameter,
} from 'epanet-js';
import type {
  HydroNetwork,
  SimulationResults,
  SimulationLinkResult,
  SimulationTimestep,
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
  details?: {
    inpContent?: string;
    reportContent?: string;
  };
}

const ctx: Worker = self as unknown as Worker;

const TRACKER_MIN = Number.POSITIVE_INFINITY;
const TRACKER_MAX = Number.NEGATIVE_INFINITY;

const createRangeTracker = () => ({
  min: TRACKER_MIN,
  max: TRACKER_MAX,
});

const updateRange = (range: { min: number; max: number }, value: number) => {
  if (Number.isFinite(value)) {
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
  }
};

const finalizeRange = (range: { min: number; max: number }) => ({
  min: range.min === TRACKER_MIN ? 0 : range.min,
  max: range.max === TRACKER_MAX ? 0 : range.max,
});

const runSimulation = (
  network: HydroNetwork,
  inpContent: string,
  workspace: Workspace,
): SimulationResults => {
  const project = new Project(workspace);
  workspace.writeFile('network.inp', inpContent);

  let projectOpened = false;
  let hydraulicsOpened = false;

  try {
    project.open('network.inp', 'report.rpt', 'out.bin');
    projectOpened = true;

    const durationParameter = project.getTimeParameter(TimeParameter.Duration);
    const reportStepParameter = project.getTimeParameter(TimeParameter.ReportStep);

    const nodeMeta = network.nodes.map((node) => ({
      node,
      index: project.getNodeIndex(node.id),
    }));
    const linkMeta = network.links.map((link) => ({
      link,
      index: project.getLinkIndex(link.id),
    }));

    project.openH();
    hydraulicsOpened = true;
    project.initH(InitHydOption.NoSave);

    const timesteps: SimulationTimestep[] = [];
    const pressureRange = createRangeTracker();
    const flowRange = createRangeTracker();
    const velocityRange = createRangeTracker();
    let tankLevelRange: { min: number; max: number } | null = null;
    let maxFlowMagnitude = 0;

    let nextStep = 0;
    do {
      const currentTime = project.runH();

      const nodesResults = nodeMeta.map(({ node, index }) => {
        const head = project.getNodeValue(index, NodeProperty.Head);
        const demand = project.getNodeValue(index, NodeProperty.Demand);
        
        // Para reservorios, calcular presión de suministro manualmente
        // EPANET retorna 0 porque son nodos de referencia
        let pressure: number;
        if (node.type === 'reservoir') {
          pressure = head * 9.81; // Convertir metros a kPa
        } else {
          pressure = project.getNodeValue(index, NodeProperty.Pressure);
        }

        updateRange(pressureRange, pressure);

        let tankLevel: number | undefined;
        if (node.type === 'tank') {
          const levelValue = project.getNodeValue(index, NodeProperty.TankLevel);
          if (Number.isFinite(levelValue)) {
            tankLevel = levelValue;
            if (!tankLevelRange) {
              tankLevelRange = { min: levelValue, max: levelValue };
            } else {
              tankLevelRange.min = Math.min(tankLevelRange.min, levelValue);
              tankLevelRange.max = Math.max(tankLevelRange.max, levelValue);
            }
          }
        }

        return {
          id: node.id,
          label: node.label,
          pressure,
          demand,
          head,
          tankLevel,
        };
      });

      const linkResults: SimulationLinkResult[] = linkMeta.map(({ link, index }) => {
        const flow = project.getLinkValue(index, LinkProperty.Flow);
        const velocity = project.getLinkValue(index, LinkProperty.Velocity);
        const headloss = project.getLinkValue(index, LinkProperty.Headloss);
        const statusValue = project.getLinkValue(index, LinkProperty.Status);
        const status: 'OPEN' | 'CLOSED' = statusValue > 0 ? 'OPEN' : 'CLOSED';

        const flowMagnitude = Math.abs(flow);
        updateRange(flowRange, flowMagnitude);
        maxFlowMagnitude = Math.max(maxFlowMagnitude, flowMagnitude);

        updateRange(velocityRange, Math.abs(velocity));

        return {
          id: link.id,
          label: link.deviceId ?? link.id,
          flow,
          velocity,
          headloss,
          status,
        };
      });

      timesteps.push({
        time: currentTime,
        nodes: nodesResults,
        links: linkResults,
      });

      nextStep = project.nextH();
    } while (nextStep > 0);

    project.closeH();
    hydraulicsOpened = false;
    project.close();
    projectOpened = false;

    const finalTimestep = timesteps[timesteps.length - 1];
    const durationFromSteps = finalTimestep ? finalTimestep.time : 0;
    const duration = Math.max(durationParameter, durationFromSteps);
    const reportStep =
      reportStepParameter > 0 && Number.isFinite(reportStepParameter)
        ? reportStepParameter
        : timesteps.length > 1
        ? Math.max(0, timesteps[1].time - timesteps[0].time)
        : duration;

    const pressureSummary = finalizeRange(pressureRange);
    const flowSummary = finalizeRange(flowRange);
    const velocitySummary = finalizeRange(velocityRange);

    const ranges = {
      pressure: pressureSummary,
      flow: flowSummary,
      velocity: velocitySummary,
      ...(tankLevelRange ? { tankLevel: tankLevelRange } : {}),
    };

    return {
      generatedAt: new Date().toISOString(),
      duration,
      reportStep: Number.isFinite(reportStep) ? reportStep : 0,
      summary: {
        maxPressure: pressureSummary.max,
        minPressure: pressureSummary.min,
        maxFlow: maxFlowMagnitude,
      },
      ranges,
      timesteps,
      nodes: finalTimestep ? finalTimestep.nodes : [],
      links: finalTimestep ? finalTimestep.links : [],
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (hydraulicsOpened) {
      try {
        project.closeH();
      } catch {
        // ignored
      }
    }
    if (projectOpened) {
      try {
        project.close();
      } catch {
        // ignored
      }
    }
  }
};

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;
  if (data.type !== 'run') return;

  const workspace = new Workspace();
  let inpContent = '';

  try {
    inpContent = buildInpFromNetwork(data.payload.network);
    const results = runSimulation(data.payload.network, inpContent, workspace);
    const response: WorkerSuccessResponse = {
      type: 'success',
      payload: results,
    };
    ctx.postMessage(response);
  } catch (error) {
    console.error('EPANET worker error', error);
    
    // Intentar leer el reporte de EPANET para más detalles
    let reportContent = '';
    try {
      reportContent = workspace.readFile('report.rpt');
    } catch (e) {
      // Ignorar si no se puede leer
    }
    
    const response: WorkerErrorResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido al simular.',
      details: {
        inpContent: inpContent || undefined,
        reportContent: reportContent || undefined,
      },
    };
    ctx.postMessage(response);
  }
});

export {};
