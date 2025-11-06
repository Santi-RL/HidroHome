import {
  Button,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useEditorStore, useNetwork, useSelection, useSimulationState } from '../../shared/state/editorStore';
import { getCatalogItem } from '../../shared/constants/catalog';

export function SelectionInspector() {
  const selection = useSelection();
  const network = useNetwork();
  const updateNode = useEditorStore((state) => state.updateNode);
  const updateLink = useEditorStore((state) => state.updateLink);
  const removeSelected = useEditorStore((state) => state.removeSelected);
  const simulation = useSimulationState();

  if (!selection) {
    return (
      <Stack gap="xs">
        <Text c="dimmed" size="sm">
          Selecciona un elemento para ver y editar sus propiedades.
        </Text>
      </Stack>
    );
  }

  if (selection.type === 'node') {
    const node = network.nodes.find((item) => item.id === selection.id);
    if (!node) {
      return null;
    }
    const catalogItem = node.deviceId ? getCatalogItem(node.deviceId) : undefined;
    const nodeResult = simulation.results?.nodes.find((result) => result.id === node.id);
    return (
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>{node.label}</Text>
          <Button size="xs" variant="light" color="red" onClick={removeSelected}>
            Eliminar
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Tipo: {catalogItem?.name ?? node.type}
        </Text>
        <TextInput
          label="Etiqueta"
          value={node.label}
          onChange={(event) => updateNode(node.id, { label: event.currentTarget.value })}
        />
        <NumberInput
          label="Demanda base (L/s)"
          value={Number((node.baseDemand * 1000).toFixed(3))}
          min={0}
          step={0.01}
          onChange={(value) => {
            if (value === '' || value === null) return;
            updateNode(node.id, { baseDemand: Number(value) / 1000 });
          }}
        />
        <NumberInput
          label="Cota (m)"
          value={node.elevation}
          step={0.1}
          onChange={(value) => {
            if (value === '' || value === null) return;
            updateNode(node.id, { elevation: Number(value) });
          }}
        />
        {node.reservoir && (
          <>
            <Divider label="Reservorio" />
            <NumberInput
              label="Carga hidráulica (m)"
              description={`Presión constante: ≈${(node.reservoir.head * 0.0981).toFixed(2)} bar / ${(node.reservoir.head * 0.0981 * 1.02).toFixed(2)} kg/cm²`}
              value={node.reservoir.head}
              step={0.5}
              min={0}
              onChange={(value) => {
                if (value === '' || value === null) return;
                updateNode(node.id, {
                  reservoir: {
                    ...node.reservoir!,
                    head: Number(value),
                  },
                });
              }}
            />
          </>
        )}

        {node.tank && (
          <>
            <Divider label="Tanque" />
            <NumberInput
              label="Nivel inicial (m)"
              value={node.tank.initLevel}
              step={0.1}
              onChange={(value) => {
                if (value === '' || value === null) return;
                updateNode(node.id, {
                  tank: {
                    ...node.tank!,
                    initLevel: Number(value),
                  },
                });
              }}
            />
            <NumberInput
              label="Diametro (m)"
              value={node.tank.diameter}
              step={0.1}
              onChange={(value) => {
                if (value === '' || value === null) return;
                updateNode(node.id, {
                  tank: {
                    ...node.tank!,
                    diameter: Number(value),
                  },
                });
              }}
            />
          </>
        )}

        {nodeResult && (
          <>
            <Divider label="Simulacion" />
            <Text size="sm">Presion: {nodeResult.pressure.toFixed(2)}</Text>
            <Text size="sm">Caudal: {nodeResult.demand.toFixed(4)}</Text>
            <Text size="sm">Carga: {nodeResult.head.toFixed(2)}</Text>
          </>
        )}
      </Stack>
    );
  }

  const link = network.links.find((item) => item.id === selection.id);
  if (!link) {
    return null;
  }
  const catalogItem = link.deviceId ? getCatalogItem(link.deviceId) : undefined;
  const result = simulation.results?.links.find((item) => item.id === link.id);

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>{catalogItem?.name ?? link.type}</Text>
        <Button size="xs" variant="light" color="red" onClick={removeSelected}>
          Eliminar
        </Button>
      </Group>
      <NumberInput
        label="Longitud (m)"
        value={link.length}
        min={0}
        step={0.1}
        onChange={(value) => {
          if (value === '' || value === null) return;
          updateLink(link.id, { length: Number(value) });
        }}
      />
      <NumberInput
        label="Diametro (mm)"
        value={link.diameter}
        min={5}
        step={1}
        onChange={(value) => {
          if (value === '' || value === null) return;
          updateLink(link.id, { diameter: Number(value) });
        }}
      />
      <NumberInput
        label="Coeficiente de rugosidad"
        value={link.roughness}
        min={10}
        step={1}
        onChange={(value) => {
          if (value === '' || value === null) return;
          updateLink(link.id, { roughness: Number(value) });
        }}
      />
      {link.pump && (
        <NumberInput
          label="Potencia bomba (kW)"
          value={link.pump.power}
          min={0}
          step={0.1}
          onChange={(value) => {
            if (value === '' || value === null) return;
            updateLink(link.id, {
              pump: {
                ...link.pump!,
                power: Number(value),
              },
            });
          }}
        />
      )}
      {link.valve && (
        <>
          <Divider label="Valvula" />
          <NumberInput
            label="Setting"
            value={link.valve.setting}
            step={1}
            onChange={(value) => {
              if (value === '' || value === null) return;
              updateLink(link.id, {
                valve: {
                  ...link.valve!,
                  setting: Number(value),
                },
              });
            }}
          />
        </>
      )}
      {result && (
        <>
          <Divider label="Simulacion" />
          <Text size="sm">Caudal: {result.flow.toFixed(4)}</Text>
          <Text size="sm">Velocidad: {result.velocity.toFixed(3)}</Text>
          <Text size="sm">Perdida: {result.headloss.toFixed(3)}</Text>
        </>
      )}
    </Stack>
  );
}
