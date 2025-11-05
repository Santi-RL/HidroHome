import { Box, Text, Stack, Group, Paper, ActionIcon, Badge, ScrollArea, Collapse } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconDroplet, IconGauge } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import type { HydroNode, HydroLink, SimulationTimestep, SimulationRanges } from '../../shared/types/hydro';
import { computeLinkVisualStyle, computeNodeVisualStyle } from '../simulation/simulationVisualMapping';
import { useFloatingPanels, useFloatingPanelsActions } from '../../shared/state/editorStore';
import { DraggableFloatingPanel } from './DraggableFloatingPanel';

// Formato de número argentino: punto para miles, coma para decimales
const formatNumberAR = (value: number, decimals: number = 2): string => {
  const fixed = value.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${formattedInteger},${decimal}` : formattedInteger;
};

interface CriticalAlert {
  id: string;
  type: 'node' | 'link';
  label: string;
  issue: string;
  severity: 'high' | 'medium';
  value?: number;
  unit?: string;
}

interface CriticalAlertsPanelProps {
  nodes: HydroNode[];
  links: HydroLink[];
  currentTimestep: SimulationTimestep | null;
  simulationRanges: SimulationRanges | null;
  onSelectElement?: (type: 'node' | 'link', id: string) => void;
}

export function CriticalAlertsPanel({
  nodes,
  links,
  currentTimestep,
  simulationRanges,
  onSelectElement,
}: CriticalAlertsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isAlertsVisible, alertsPosition } = useFloatingPanels();
  const { toggleAlertsPanel, setAlertsPosition } = useFloatingPanelsActions();

  // Detectar elementos críticos
  const criticalAlerts = useMemo(() => {
    if (!currentTimestep || !simulationRanges) {
      return [];
    }

    const alerts: CriticalAlert[] = [];

    // Analizar nodos
    currentTimestep.nodes.forEach((nodeResult) => {
      const node = nodes.find((n) => n.id === nodeResult.id);
      if (!node) return;

      const style = computeNodeVisualStyle(nodeResult, simulationRanges, {
        metric: typeof nodeResult.tankLevel === 'number' ? 'tankLevel' : 'pressure',
        highlightIssues: true,
      });

      if (style.isCritical) {
        const pressureThreshold = simulationRanges.pressure.max * 0.05;
        
        if (nodeResult.pressure <= pressureThreshold) {
          alerts.push({
            id: node.id,
            type: 'node',
            label: node.label,
            issue: nodeResult.pressure <= 0 ? 'Sin presión' : 'Presión crítica baja',
            severity: nodeResult.pressure <= 0 ? 'high' : 'medium',
            value: nodeResult.pressure,
            unit: 'kPa',
          });
        }
      }
    });

    // Analizar enlaces
    currentTimestep.links.forEach((linkResult) => {
      const link = links.find((l) => l.id === linkResult.id);
      if (!link) return;

      const style = computeLinkVisualStyle(linkResult, simulationRanges, {
        metric: 'flow',
        highlightIssues: true,
      });

      if (style.isCritical) {
        const absoluteFlow = Math.abs(linkResult.flow);
        const fromNode = nodes.find((n) => n.id === link.from);
        const toNode = nodes.find((n) => n.id === link.to);
        const linkLabel = fromNode && toNode 
          ? `${fromNode.label} → ${toNode.label}`
          : link.id;

        if (absoluteFlow === 0) {
          alerts.push({
            id: link.id,
            type: 'link',
            label: linkLabel,
            issue: 'Sin flujo de agua',
            severity: 'high',
            value: 0,
            unit: 'L/s',
          });
        } else {
          alerts.push({
            id: link.id,
            type: 'link',
            label: linkLabel,
            issue: 'Flujo muy bajo',
            severity: 'medium',
            value: absoluteFlow,
            unit: 'L/s',
          });
        }
      }
    });

    // Ordenar por severidad (high primero)
    return alerts.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      return 0;
    });
  }, [nodes, links, currentTimestep, simulationRanges]);

  if (!currentTimestep || criticalAlerts.length === 0) {
    return null;
  }

  return (
    <DraggableFloatingPanel
      title="Alertas Críticas"
      position={alertsPosition}
      isVisible={isAlertsVisible}
      onClose={toggleAlertsPanel}
      onPositionChange={setAlertsPosition}
      defaultPosition={{ x: 16, y: 80 }}
      width={340}
      zIndex={101}
    >
      <Box
        style={{
          backgroundColor: 'rgba(254, 242, 242, 0.6)',
          borderRadius: 8,
          padding: 8,
        }}
      >
        <Group justify="space-between" mb={isExpanded ? 'sm' : 0}>
          <Group gap="xs">
            <IconAlertTriangle size={18} color="#dc2626" />
            <Text size="sm" fw={700} c="red.8">
              Alertas
            </Text>
            <Badge color="red" size="sm" circle>
              {criticalAlerts.length}
            </Badge>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Contraer alertas' : 'Expandir alertas'}
          >
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>

        <Collapse in={isExpanded}>
          <ScrollArea.Autosize mah="50vh" offsetScrollbars>
            <Stack gap="xs">
              {criticalAlerts.map((alert) => (
                <Paper
                  key={`${alert.type}-${alert.id}`}
                  p="xs"
                  radius="sm"
                  style={{
                    backgroundColor: alert.severity === 'high' 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : 'rgba(251, 146, 60, 0.1)',
                    border: `1px solid ${alert.severity === 'high' ? '#ef4444' : '#fb923c'}`,
                    cursor: onSelectElement ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => onSelectElement?.(alert.type, alert.id)}
                  onMouseEnter={(e) => {
                    if (onSelectElement) {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onSelectElement) {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <Stack gap={4}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        {alert.type === 'node' ? (
                          <IconGauge size={14} color={alert.severity === 'high' ? '#dc2626' : '#f97316'} />
                        ) : (
                          <IconDroplet size={14} color={alert.severity === 'high' ? '#dc2626' : '#f97316'} />
                        )}
                        <Text size="xs" fw={600} c={alert.severity === 'high' ? 'red.8' : 'orange.8'}>
                          {alert.label}
                        </Text>
                      </Group>
                      <Badge 
                        size="xs" 
                        color={alert.severity === 'high' ? 'red' : 'orange'}
                        variant="filled"
                      >
                        {alert.severity === 'high' ? 'ALTA' : 'MEDIA'}
                      </Badge>
                    </Group>
                    
                    <Text size="xs" c="dark.6">
                      {alert.issue}
                    </Text>
                    
                    {alert.value !== undefined && (
                      <Text size="xs" c="dark.7" style={{ fontFamily: 'monospace' }}>
                        Valor: {formatNumberAR(alert.value, 3)} {alert.unit}
                      </Text>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>

          <Box mt="sm" pt="xs" style={{ borderTop: '1px solid rgba(220, 38, 38, 0.2)' }}>
            <Text size="xs" c="dimmed" ta="center" style={{ fontStyle: 'italic' }}>
              {onSelectElement ? 'Click en una alerta para ir al elemento' : ''}
            </Text>
          </Box>
        </Collapse>
      </Box>
    </DraggableFloatingPanel>
  );
}
