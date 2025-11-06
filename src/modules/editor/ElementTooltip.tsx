import { Box, Text, Stack, Group, Paper, Badge, Divider } from '@mantine/core';
import { IconDroplet, IconGauge, IconActivity, IconAlertTriangle } from '@tabler/icons-react';
import type { HydroNode, HydroLink, SimulationNodeResult, SimulationLinkResult } from '../../shared/types/hydro';
import { getCatalogItem } from '../../shared/constants/catalog';

// Formato de número argentino: punto para miles, coma para decimales
const formatNumberAR = (value: number, decimals: number = 2): string => {
  const fixed = value.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${formattedInteger},${decimal}` : formattedInteger;
};

interface ElementTooltipProps {
  selectedNode?: HydroNode;
  selectedLink?: HydroLink;
  nodeResult?: SimulationNodeResult;
  linkResult?: SimulationLinkResult;
  fromNode?: HydroNode;
  toNode?: HydroNode;
  isCritical?: boolean;
}

export function ElementTooltip({
  selectedNode,
  selectedLink,
  nodeResult,
  linkResult,
  fromNode,
  toNode,
  isCritical,
}: ElementTooltipProps) {
  if (!selectedNode && !selectedLink) {
    return null;
  }

  const catalogItem = (selectedNode?.deviceId || selectedLink?.deviceId)
    ? getCatalogItem(selectedNode?.deviceId || selectedLink?.deviceId || '')
    : undefined;

  return (
    <Paper
      shadow="lg"
      radius="md"
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 320,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        border: isCritical ? '2px solid #dc2626' : '1px solid rgba(0, 0, 0, 0.1)',
        zIndex: 100,
      }}
    >
      <Box p="md">
        <Stack gap="sm">
          {/* Header con tipo de elemento */}
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={700} c="dark.8">
              {selectedNode ? selectedNode.label : selectedLink?.id}
            </Text>
            {isCritical && (
              <Badge color="red" leftSection={<IconAlertTriangle size={12} />} size="sm">
                Crítico
              </Badge>
            )}
          </Group>

          <Badge variant="light" color={catalogItem?.color || 'blue'} size="sm">
            {catalogItem?.name || (selectedNode ? 'Nodo' : 'Enlace')}
          </Badge>

          <Divider />

          {/* Datos de Nodo */}
          {selectedNode && nodeResult && (
            <Stack gap="xs">
              <Group gap="xs">
                <IconGauge size={16} style={{ color: '#3b82f6' }} />
                <Text size="xs" fw={600} c="dark.7">
                  {selectedNode.type === 'reservoir' ? 'Presión de suministro:' : 'Presión:'}
                </Text>
                <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                  {Number.isFinite(nodeResult.pressure)
                    ? `${formatNumberAR(nodeResult.pressure, 2)} kPa`
                    : '--'}
                  {selectedNode.type === 'reservoir' && Number.isFinite(nodeResult.pressure) && (
                    <Text component="span" size="xs" c="dimmed" ml={4}>
                      ({formatNumberAR(nodeResult.pressure / 98.1, 2)} bar)
                    </Text>
                  )}
                </Text>
              </Group>

              {Number.isFinite(nodeResult.head) && (
                <Group gap="xs">
                  <Text size="xs" c="dark.6" ml={22}>
                    Altura piezométrica:
                  </Text>
                  <Text size="xs" c="dark.7" style={{ fontFamily: 'monospace' }}>
                    {formatNumberAR(nodeResult.head, 2)} m
                  </Text>
                </Group>
              )}

              {selectedNode.type === 'reservoir' && Number.isFinite(nodeResult.demand) && (
                <Group gap="xs">
                  <IconDroplet size={16} style={{ color: '#06b6d4' }} />
                  <Text size="xs" fw={600} c="dark.7">
                    Caudal entregado:
                  </Text>
                  <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                    {formatNumberAR(Math.abs(nodeResult.demand), 3)} L/s
                  </Text>
                </Group>
              )}

              {(selectedNode.type === 'fixture' || selectedNode.baseDemand > 0) && (
                <Group gap="xs">
                  <IconDroplet size={16} style={{ color: '#06b6d4' }} />
                  <Text size="xs" fw={600} c="dark.7">
                    Demanda:
                  </Text>
                  <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                    {Number.isFinite(nodeResult.demand)
                      ? `${formatNumberAR(nodeResult.demand, 3)} L/s`
                      : '--'}
                  </Text>
                </Group>
              )}

              {selectedNode.type === 'tank' && typeof nodeResult.tankLevel === 'number' && (
                <Group gap="xs">
                  <IconActivity size={16} style={{ color: '#8b5cf6' }} />
                  <Text size="xs" fw={600} c="dark.7">
                    Nivel de tanque:
                  </Text>
                  <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                    {formatNumberAR(nodeResult.tankLevel, 2)} m
                  </Text>
                </Group>
              )}

              <Divider variant="dashed" my={4} />

              <Text size="xs" c="dimmed">
                Elevación: {formatNumberAR(selectedNode.elevation || 0, 1)} m
              </Text>
            </Stack>
          )}

          {/* Datos de Enlace */}
          {selectedLink && linkResult && (
            <Stack gap="xs">
              <Group gap="xs">
                <IconDroplet size={16} style={{ color: '#06b6d4' }} />
                <Text size="xs" fw={600} c="dark.7">
                  Flujo:
                </Text>
                <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                  {Number.isFinite(linkResult.flow)
                    ? `${formatNumberAR(Math.abs(linkResult.flow), 3)} L/s`
                    : '--'}
                </Text>
              </Group>

              {linkResult.flow < 0 && (
                <Badge color="orange" size="xs" ml={22}>
                  Flujo inverso
                </Badge>
              )}

              {Number.isFinite(linkResult.velocity) && (
                <Group gap="xs">
                  <IconActivity size={16} style={{ color: '#8b5cf6' }} />
                  <Text size="xs" fw={600} c="dark.7">
                    Velocidad:
                  </Text>
                  <Text size="xs" c="dark.8" fw={500} style={{ fontFamily: 'monospace' }}>
                    {formatNumberAR(linkResult.velocity, 2)} m/s
                  </Text>
                </Group>
              )}

              {Number.isFinite(linkResult.headloss) && Math.abs(linkResult.headloss) > 0.01 && (
                <Group gap="xs">
                  <Text size="xs" c="dark.6" ml={22}>
                    Pérdida de carga:
                  </Text>
                  <Text size="xs" c="dark.7" style={{ fontFamily: 'monospace' }}>
                    {formatNumberAR(Math.abs(linkResult.headloss), 3)} m
                  </Text>
                </Group>
              )}

              {fromNode && toNode && (
                <>
                  <Divider variant="dashed" my={4} />
                  <Text size="xs" c="dimmed">
                    Desde: {fromNode.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Hasta: {toNode.label}
                  </Text>
                </>
              )}

              {selectedLink.type === 'pipe' && (
                <>
                  <Divider variant="dashed" my={4} />
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      Longitud:
                    </Text>
                    <Text size="xs" c="dark.7" style={{ fontFamily: 'monospace' }}>
                      {formatNumberAR(selectedLink.length || 0, 1)} m
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      Diámetro:
                    </Text>
                    <Text size="xs" c="dark.7" style={{ fontFamily: 'monospace' }}>
                      {formatNumberAR((selectedLink.diameter || 0) * 1000, 0)} mm
                    </Text>
                  </Group>
                </>
              )}
            </Stack>
          )}

          {/* Advertencia si no hay datos de simulación */}
          {selectedNode && !nodeResult && (
            <Text size="xs" c="dimmed" ta="center" py="sm">
              No hay datos de simulación para este elemento
            </Text>
          )}

          {selectedLink && !linkResult && (
            <Text size="xs" c="dimmed" ta="center" py="sm">
              No hay datos de simulación para este elemento
            </Text>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
