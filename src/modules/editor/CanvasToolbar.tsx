import { ActionIcon, Group, Paper, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconChartBar } from '@tabler/icons-react';
import { useFloatingPanels, useFloatingPanelsActions } from '../../shared/state/editorStore';

export function CanvasToolbar() {
  const { isLegendVisible, isAlertsVisible } = useFloatingPanels();
  const { toggleLegendPanel, toggleAlertsPanel } = useFloatingPanelsActions();

  return (
    <Paper
      shadow="md"
      radius="md"
      p="xs"
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        zIndex: 100,
      }}
    >
      <Group gap="xs" justify="center">
        <Tooltip label={isLegendVisible ? 'Ocultar leyenda' : 'Mostrar leyenda'} position="bottom">
          <ActionIcon
            variant={isLegendVisible ? 'filled' : 'light'}
            color="blue"
            size="lg"
            onClick={toggleLegendPanel}
            aria-label="Toggle leyenda de simulación"
          >
            <IconChartBar size={20} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isAlertsVisible ? 'Ocultar alertas' : 'Mostrar alertas'} position="bottom">
          <ActionIcon
            variant={isAlertsVisible ? 'filled' : 'light'}
            color="red"
            size="lg"
            onClick={toggleAlertsPanel}
            aria-label="Toggle alertas críticas"
          >
            <IconAlertTriangle size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}
