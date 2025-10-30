import { useCallback, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { useEditorStore } from '../../shared/state/editorStore';
import type { SimulationResults } from '../../shared/types/hydro';

type WorkerMessage =
  | { type: 'success'; payload: SimulationResults }
  | { type: 'error'; error: string };

export const useSimulationRunner = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingPromise = useRef<{
    resolve: (result: SimulationResults) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const setStatus = useEditorStore((state) => state.setSimulationStatus);
  const setResults = useEditorStore((state) => state.setSimulationResults);
  const setError = useEditorStore((state) => state.setSimulationError);

  useEffect(() => {
    const worker = new Worker(new URL('./epanet.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      if (data.type === 'success') {
        setResults(data.payload);
        setStatus('success');
        pendingPromise.current?.resolve(data.payload);
        pendingPromise.current = null;
        notifications.show({
          title: 'Simulacion completada',
          message: 'Los resultados se actualizaron correctamente.',
        });
      } else if (data.type === 'error') {
        const error = new Error(data.error);
        setError(data.error);
        setStatus('error');
        pendingPromise.current?.reject(error);
        pendingPromise.current = null;
        notifications.show({
          title: 'No se pudo simular',
          message: data.error,
          color: 'red',
        });
      }
    };

    const handleError = (errorEvent: ErrorEvent) => {
      const message = errorEvent.message || 'Fallo inesperado en el simulador.';
      setError(message);
      setStatus('error');
      const error = new Error(message);
      pendingPromise.current?.reject(error);
      pendingPromise.current = null;
      notifications.show({
        title: 'Error en simulador',
        message,
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
      if (state.network.nodes.length === 0) {
        const error = new Error('Agrega nodos y conexiones antes de simular.');
        reject(error);
        setError(error.message);
        setStatus('error');
        return;
      }

      setStatus('running');
      pendingPromise.current = { resolve, reject };

      worker.postMessage({
        type: 'run',
        payload: { network: state.network },
      });
    });
  }, [setError, setStatus]);

  return { runSimulation };
};
