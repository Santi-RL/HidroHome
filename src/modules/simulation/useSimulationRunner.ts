import { useCallback, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { useEditorStore } from '../../shared/state/editorStore';
import type { SimulationResults } from '../../shared/types/hydro';
import type { SimulationErrorDetail } from '../../shared/types/simulation';
import { mapWorkerErrorToDetails } from './simulationErrors';
import { validateNetworkForSimulation } from './networkValidation';
import { validateSimulationResults } from '../../shared/utils/simulationMigration';

type WorkerMessage =
  | { type: 'success'; payload: SimulationResults }
  | { 
      type: 'error'; 
      error: string;
      details?: {
        inpContent?: string;
        reportContent?: string;
      };
    };

export const useSimulationRunner = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingPromise = useRef<{
    resolve: (result: SimulationResults) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const setStatus = useEditorStore((state) => state.setSimulationStatus);
  const setResults = useEditorStore((state) => state.setSimulationResults);
  const setError = useEditorStore((state) => state.setSimulationError);
  const resetSimulation = useEditorStore((state) => state.resetSimulation);

  useEffect(() => {
    const worker = new Worker(new URL('./epanet.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      if (data.type === 'success') {
        const validation = validateSimulationResults(data.payload);
        if (!validation.valid) {
          const details: SimulationErrorDetail[] = validation.errors.map((message, index) => ({
            code: `simulation.results.invalid.${index}`,
            title: 'Resultados de simulación incompletos',
            description: message,
            solution:
              'Revisa la configuración temporal (duración e intervalos) y vuelve a ejecutar la simulación.',
          }));
          setError(details);
          const summaryMessage =
            validation.errors.length > 0
              ? validation.errors.join(' | ')
              : 'Resultados de simulación inválidos';
          pendingPromise.current?.reject(new Error(summaryMessage));
          pendingPromise.current = null;
          notifications.show({
            title: 'Resultados inválidos',
            message: validation.errors[0] ?? 'Los datos devueltos no tienen la estructura esperada.',
            color: 'red',
          });
          return;
        }

        setResults(data.payload);
        setStatus('success');
        pendingPromise.current?.resolve(data.payload);
        pendingPromise.current = null;
        notifications.show({
          title: 'Simulacion completada',
          message: 'Los resultados se actualizaron correctamente.',
        });
      } else if (data.type === 'error') {
        const details = mapWorkerErrorToDetails(data.error);
        
        // Log detallado solo si hay información adicional
        if (data.details?.inpContent || data.details?.reportContent) {
          console.error('=== SIMULATION ERROR DETAILS ===');
          console.error('Error:', data.error);
          if (data.details.inpContent) {
            console.error('\nINP Content:');
            console.error(data.details.inpContent);
          }
          if (data.details.reportContent) {
            console.error('\nEPANET Report:');
            console.error(data.details.reportContent);
          }
          console.error('=== END ERROR DETAILS ===');
        }
        
        const summary = details.map((detail) => detail.title).join(' | ');
        setError(details);
        pendingPromise.current?.reject(new Error(summary));
        pendingPromise.current = null;
        notifications.show({
          title: 'No se pudo simular',
          message: details[0]?.description ?? data.error,
          color: 'red',
        });
      }
    };

    const handleError = (errorEvent: ErrorEvent) => {
      const message = errorEvent.message || 'Fallo inesperado en el simulador.';
      const details = mapWorkerErrorToDetails(message);
      const summary = details.map((detail) => detail.title).join(' | ');
      setError(details);
      pendingPromise.current?.reject(new Error(summary));
      pendingPromise.current = null;
      notifications.show({
        title: 'Error en simulador',
        message: details[0]?.description ?? message,
        color: 'red',
      });
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    };
  }, [setResults, setStatus, setError]);

  const runSimulation = useCallback(() => {
    return new Promise<SimulationResults>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        const error = new Error('El motor de simulacion no esta disponible.');
        reject(error);
        return;
      }

      const state = useEditorStore.getState();
      const validationIssues = validateNetworkForSimulation(state.network);
      if (validationIssues.length > 0) {
        const summary = validationIssues.map((detail) => detail.title).join(' | ');
        setError(validationIssues);
        notifications.show({
          title: 'No se pudo simular',
          message: validationIssues[0]?.description ?? 'La red necesita correcciones antes de simular.',
          color: 'red',
        });
        reject(new Error(summary));
        return;
      }

      resetSimulation();
      setStatus('running');
      pendingPromise.current = { resolve, reject };

      worker.postMessage({
        type: 'run',
        payload: { network: state.network },
      });
    });
  }, [resetSimulation, setError, setStatus]);

  return { runSimulation };
};


