import { useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useIsDirty, useNetwork, useUnitSystem, useEditorStore } from '../../shared/state/editorStore';
import type { HydroProjectFile } from '../../shared/types/hydro';
import { clearAutosave, loadAutosave, saveAutosave } from './projectStorage';

const PROJECT_VERSION = '0.1.0';

export const useAutosave = () => {
  const network = useNetwork();
  const unitSystem = useUnitSystem();
  const isDirty = useIsDirty();
  const markSaved = useEditorStore((state) => state.markSaved);
  const loadNetwork = useEditorStore((state) => state.loadNetwork);

  useEffect(() => {
    if (!isDirty) return;
    const project: HydroProjectFile = {
      version: PROJECT_VERSION,
      network,
      preferences: {
        unitSystem,
      },
    };

    saveAutosave(project).catch((error) => {
      console.error('Autosave error', error);
    });
  }, [network, unitSystem, isDirty]);

  const recoverAutosave = useCallback(async () => {
    const saved = await loadAutosave();
    if (saved) {
      loadNetwork(saved.network);
      notifications.show({
        title: 'Proyecto recuperado',
        message: 'Se cargo automaticamente el ultimo guardado.',
      });
      markSaved();
    }
  }, [loadNetwork, markSaved]);

  const clearAutosaveData = useCallback(() => {
    clearAutosave().catch((error) => {
      console.error('No se pudo limpiar el autosave', error);
    });
  }, []);

  return {
    recoverAutosave,
    clearAutosave: clearAutosaveData,
    currentVersion: PROJECT_VERSION,
  };
};
