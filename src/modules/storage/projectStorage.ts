import { del, get, set } from 'idb-keyval';
import { notifications } from '@mantine/notifications';
import type { HydroProjectFile } from '../../shared/types/hydro';

const AUTOSAVE_KEY = 'hidrohome_autosave_v1';

export const exportProjectFile = (project: HydroProjectFile) => {
  const content = JSON.stringify(project, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.network.name || 'hidrohome-proyecto'}.hydrohome.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  notifications.show({
    title: 'Proyecto exportado',
    message: 'Se descargo el archivo del proyecto.',
  });
};

export const importProjectFile = async (file: File): Promise<HydroProjectFile> => {
  const text = await file.text();
  return JSON.parse(text) as HydroProjectFile;
};

export const saveAutosave = async (project: HydroProjectFile) => {
  await set(AUTOSAVE_KEY, project);
};

export const loadAutosave = async (): Promise<HydroProjectFile | undefined> => {
  return get<HydroProjectFile>(AUTOSAVE_KEY);
};

export const clearAutosave = () => del(AUTOSAVE_KEY);
