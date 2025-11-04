import { Box, Text, Stack, Group, Paper, ActionIcon, Collapse } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';
import { useSimulationRanges } from '../../shared/state/editorStore';
import { computeLegendStops } from '../simulation/simulationVisualMapping';

// Formato de número argentino: punto para miles, coma para decimales
const formatNumberAR = (value: number, decimals: number = 2): string => {
  const fixed = value.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${formattedInteger},${decimal}` : formattedInteger;
};

export function SimulationLegend() {
  const simulationRanges = useSimulationRanges();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!simulationRanges) {
    return null;
  }

  // Generar escalas de color para flujo y presión
  const flowStops = computeLegendStops(simulationRanges, 'flow', 5);
  const pressureStops = computeLegendStops(simulationRanges, 'pressure', 5);

  return (
    <Paper
      shadow="md"
      radius="md"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 260,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        zIndex: 100,
      }}
    >
      <Box p="sm">
        <Group justify="space-between" mb={isExpanded ? 'sm' : 0}>
          <Text size="sm" fw={600} c="dark.8">
            Leyenda de Simulación
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Contraer leyenda' : 'Expandir leyenda'}
          >
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>

        <Collapse in={isExpanded}>
          <Stack gap="md">
            {/* Leyenda de Flujo en Tuberías */}
            <Box>
              <Text size="xs" fw={600} c="dark.7" mb={6}>
                Flujo en Tuberías (L/s)
              </Text>
              <Stack gap={4}>
                {flowStops.map((stop, index) => (
                  <Group key={index} gap="xs" wrap="nowrap">
                    <Box
                      style={{
                        width: 32,
                        height: 16,
                        backgroundColor: stop.color,
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                    <Text size="xs" c="dark.6" style={{ fontFamily: 'monospace' }}>
                      {formatNumberAR(stop.value, 2)}
                    </Text>
                  </Group>
                ))}
              </Stack>
              <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: 'italic' }}>
                Colores más oscuros → Mayor flujo
              </Text>
            </Box>

            {/* Leyenda de Presión en Nodos */}
            <Box>
              <Text size="xs" fw={600} c="dark.7" mb={6}>
                Presión en Nodos (kPa)
              </Text>
              <Stack gap={4}>
                {pressureStops.map((stop, index) => (
                  <Group key={index} gap="xs" wrap="nowrap">
                    <Box
                      style={{
                        width: 32,
                        height: 16,
                        backgroundColor: stop.color,
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                    <Text size="xs" c="dark.6" style={{ fontFamily: 'monospace' }}>
                      {formatNumberAR(stop.value, 1)}
                    </Text>
                  </Group>
                ))}
              </Stack>
              <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: 'italic' }}>
                Colores más oscuros → Mayor presión
              </Text>
            </Box>

            {/* Leyenda de Partículas */}
            <Box>
              <Text size="xs" fw={600} c="dark.7" mb={6}>
                Flujo de Agua
              </Text>
              <Stack gap={4}>
                <Group gap="xs" wrap="nowrap">
                  <Box
                    style={{
                      width: 32,
                      height: 16,
                      backgroundColor: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      borderRadius: 4,
                      flexShrink: 0,
                      boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
                    }}
                  />
                  <Text size="xs" c="dark.6">
                    Partículas blancas/claras
                  </Text>
                </Group>
              </Stack>
              <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: 'italic' }}>
                Mayor velocidad → Más partículas
              </Text>
            </Box>

            {/* Indicadores Críticos */}
            <Box>
              <Text size="xs" fw={600} c="dark.7" mb={6}>
                Alertas
              </Text>
              <Stack gap={4}>
                <Group gap="xs" wrap="nowrap">
                  <Box
                    style={{
                      width: 32,
                      height: 16,
                      backgroundColor: '#b91c1c',
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      borderRadius: 4,
                      flexShrink: 0,
                      boxShadow: '0 0 8px rgba(185, 28, 28, 0.6)',
                    }}
                  />
                  <Text size="xs" c="red.7" fw={500}>
                    Sin flujo / Baja presión
                  </Text>
                </Group>
              </Stack>
            </Box>
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
}
