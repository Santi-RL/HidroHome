import { Button, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useSimulationState } from '../../shared/state/editorStore';
import { useSimulationRunner } from './useSimulationRunner';

export function SimulationPanel() {
  const simulation = useSimulationState();
  const { runSimulation } = useSimulationRunner();

  const handleRun = async () => {
    try {
      await runSimulation();
    } catch (error) {
      console.error('Simulation run error', error);
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Simulacion hidraulica</Text>
        {simulation.status === 'running' && <Loader size="sm" />}
      </Group>
      <Button
        onClick={handleRun}
        leftSection={<IconPlayerPlay size={16} />}
        loading={simulation.status === 'running'}
      >
        Ejecutar simulacion
      </Button>
      {simulation.status === 'error' && simulation.error && (
        <Text c="red" size="sm">
          {simulation.error}
        </Text>
      )}
      {simulation.results && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            Generado: {new Date(simulation.results.generatedAt).toLocaleString()}
          </Text>
          <Table withColumnBorders striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Variable</Table.Th>
                <Table.Th>Valor</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Presion maxima</Table.Td>
                <Table.Td>{simulation.results.summary.maxPressure.toFixed(2)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Presion minima</Table.Td>
                <Table.Td>{simulation.results.summary.minPressure.toFixed(2)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Caudal maximo</Table.Td>
                <Table.Td>{simulation.results.summary.maxFlow.toFixed(3)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      )}
    </Stack>
  );
}
