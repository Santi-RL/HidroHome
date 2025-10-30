import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import {
  AppShell,
  Box,
  Button,
  FileButton,
  Group,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  rem,
} from '@mantine/core';
import { IconCloudDownload, IconDeviceFloppy } from '@tabler/icons-react';
import { CatalogPanel } from '../modules/catalog/CatalogPanel';
import { EditorCanvas } from '../modules/editor/EditorCanvas';
import { SelectionInspector } from '../modules/editor/SelectionInspector';
import { SimulationPanel } from '../modules/simulation/SimulationPanel';
import { Simple3DViewer } from '../modules/viewer3d/Simple3DViewer';
import {
  useEditorStore,
  useIsDirty,
  useNetwork,
  useUnitSystem,
} from '../shared/state/editorStore';
import { UNIT_SYSTEMS, type UnitSystemId } from '../shared/types/hydro';
import { exportProjectFile, importProjectFile } from '../modules/storage/projectStorage';
import { useAutosave } from '../modules/storage/useAutosave';
import { notifications } from '@mantine/notifications';

const unitOptions = Object.entries(UNIT_SYSTEMS).map(([id, config]) => ({
  value: id,
  label: config.label,
}));

export function App() {
  const [navbarWidth, setNavbarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const network = useNetwork();
  const unitSystem = useUnitSystem();
  const isDirty = useIsDirty();
  const setNetworkName = useEditorStore((state) => state.setNetworkName);
  const setUnitSystem = useEditorStore((state) => state.setUnitSystem);
  const loadNetwork = useEditorStore((state) => state.loadNetwork);
  const markSaved = useEditorStore((state) => state.markSaved);
  const { recoverAutosave, currentVersion } = useAutosave();

  useEffect(() => {
    void recoverAutosave();
  }, [recoverAutosave]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const rawWidth = event.clientX - rect.left;
      const min = 220;
      const max = 420;
      const nextWidth = Math.min(Math.max(rawWidth, min), max);
      setNavbarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleExport = () => {
    const project = {
      version: currentVersion,
      network,
      preferences: { unitSystem },
    };
    exportProjectFile(project);
    markSaved();
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const project = await importProjectFile(file);
      loadNetwork(project.network);
      if (project.preferences?.unitSystem) {
        setUnitSystem(project.preferences.unitSystem as UnitSystemId);
      }
      markSaved();
      notifications.show({
        title: 'Proyecto cargado',
        message: 'Importaste un proyecto existente.',
      });
    } catch (error) {
      console.error('Error importing project', error);
      notifications.show({
        title: 'No se pudo importar',
        message: 'Revisa que el archivo sea un proyecto valido.',
        color: 'red',
      });
    }
  };

  const handleResizeMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);
  }, []);

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: navbarWidth, breakpoint: 'sm' }}
      aside={{ width: 320, breakpoint: 'lg' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Text fw={700} size="lg">
              HidroHome
            </Text>
            <TextInput
              value={network.name}
              onChange={(event) => setNetworkName(event.currentTarget.value)}
              placeholder="Nombre del proyecto"
              style={{ width: rem(240) }}
              rightSection={isDirty ? <Text c="orange" size="xs">mod</Text> : null}
            />
          </Group>
          <Group gap="sm">
            <Select
              data={unitOptions}
              value={unitSystem}
              onChange={(value) => {
                if (value) setUnitSystem(value as UnitSystemId);
              }}
              placeholder="Unidades"
              style={{ width: rem(220) }}
            />
            <FileButton onChange={handleImport} accept=".json,.hydrohome,.hydrohome.json">
              {(props) => (
                <Button variant="light" leftSection={<IconCloudDownload size={16} />} {...props}>
                  Importar
                </Button>
              )}
            </FileButton>
            <Button onClick={handleExport} leftSection={<IconDeviceFloppy size={16} />}>
              Exportar
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        ref={sidebarRef}
        style={{
          width: navbarWidth,
          minWidth: navbarWidth,
          overflow: 'visible',
        }}
      >
        <Box h="100%" px="md" py="md">
          <CatalogPanel />
        </Box>
        <Box
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: -4,
            width: 8,
            cursor: 'col-resize',
            zIndex: 20,
            borderRight: '2px solid rgba(15,23,42,0.1)',
          }}
        />
      </AppShell.Navbar>

      <AppShell.Aside p="md">
        <ScrollArea h="100%" scrollHideDelay={400}>
          <Stack gap="lg" pb="md">
            <SelectionInspector />
            <SimulationPanel />
          </Stack>
        </ScrollArea>
      </AppShell.Aside>

      <AppShell.Main>
        <Stack gap="md" h="100%">
          <Box style={{ flex: 1, minHeight: 480 }}>
            <EditorCanvas />
          </Box>
          <Simple3DViewer />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
