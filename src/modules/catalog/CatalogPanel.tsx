import type { DragEvent } from 'react';
import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { CATALOG_SECTIONS, type CatalogItem, type CatalogLinkItem } from '../../shared/constants/catalog';
import { useActiveLinkTemplateId, useEditorStore } from '../../shared/state/editorStore';

const DRAG_DATA_KEY = 'application/hidrohome-catalog-item';

const isLinkItem = (item: CatalogItem): item is CatalogLinkItem => item.element === 'link';

export function CatalogPanel() {
  const activeLinkTemplateId = useActiveLinkTemplateId();
  const setActiveLinkTemplate = useEditorStore((state) => state.setActiveLinkTemplate);

  const handleDragStart = (event: DragEvent, item: CatalogItem) => {
    if (item.element !== 'node') return;
    event.dataTransfer.setData(DRAG_DATA_KEY, item.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleLinkClick = (item: CatalogLinkItem) => {
    setActiveLinkTemplate(activeLinkTemplateId === item.id ? null : item.id);
  };

  return (
    <ScrollArea style={{ height: '100%' }} scrollHideDelay={500}>
      <Stack gap="md" py="sm" pr="sm">
        {Object.entries(CATALOG_SECTIONS).map(([category, items]) => (
          <Stack key={category} gap={6}>
            <Text size="sm" fw={600} tt="uppercase" c="dimmed">
              {category}
            </Text>
            <Stack gap="xs">
              {items.map((item) => (
                <Tooltip key={item.id} label={item.description} position="right" withinPortal>
                  <Paper
                    p="xs"
                    radius="sm"
                    withBorder
                    style={{
                      borderColor: item.color,
                      cursor: item.element === 'node' ? 'grab' : 'pointer',
                    }}
                    draggable={item.element === 'node'}
                    onDragStart={(event) => handleDragStart(event, item)}
                    onDragEnd={(event) => event.dataTransfer.clearData(DRAG_DATA_KEY)}
                    onClick={() => {
                      if (isLinkItem(item)) {
                        handleLinkClick(item);
                      }
                    }}
                  >
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <item.icon size={20} color={item.color} />
                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {item.name}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {item.description}
                          </Text>
                        </Stack>
                      </Group>
                      {isLinkItem(item) ? (
                        <Button
                          size="xs"
                          variant={activeLinkTemplateId === item.id ? 'filled' : 'light'}
                          color={item.color}
                          onClick={() => handleLinkClick(item)}
                        >
                          {activeLinkTemplateId === item.id ? 'Activo' : 'Usar'}
                        </Button>
                      ) : (
                        <Badge color={item.color} variant="light">
                          Arrastrar
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                </Tooltip>
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </ScrollArea>
  );
}

export { DRAG_DATA_KEY as CATALOG_DRAG_DATA_KEY };
