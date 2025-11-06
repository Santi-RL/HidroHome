import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { ActionIcon, Box, Group, Paper, Text } from '@mantine/core';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import type { Vec2 } from '../../shared/types/math';

interface DraggableFloatingPanelProps {
  title: string;
  children: ReactNode;
  position: Vec2 | null;
  isVisible: boolean;
  onClose: () => void;
  onPositionChange: (position: Vec2) => void;
  defaultPosition: Vec2;
  width?: number;
  zIndex?: number;
}

export function DraggableFloatingPanel({
  title,
  children,
  position,
  isVisible,
  onClose,
  onPositionChange,
  defaultPosition,
  width = 260,
  zIndex = 100,
}: DraggableFloatingPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Vec2>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const actualPosition = position ?? defaultPosition;

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    if (!panelRef.current) return;

    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setIsDragging(true);
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const panelElement = panelRef.current;
      if (!panelElement) {
        return;
      }

      const offsetParent = panelElement.offsetParent as HTMLElement | null;
      let containerLeft = 0;
      let containerTop = 0;

      if (offsetParent) {
        const rect = offsetParent.getBoundingClientRect();
        containerLeft = rect.left + offsetParent.clientLeft;
        containerTop = rect.top + offsetParent.clientTop;
      } else if (panelElement.parentElement instanceof HTMLElement) {
        const rect = panelElement.parentElement.getBoundingClientRect();
        containerLeft = rect.left + panelElement.parentElement.clientLeft;
        containerTop = rect.top + panelElement.parentElement.clientTop;
      }

      const newPosition = {
        x: event.clientX - dragOffset.x - containerLeft,
        y: event.clientY - dragOffset.y - containerTop,
      };

      onPositionChange(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  useEffect(() => {
    if (!isVisible && isDragging) {
      setIsDragging(false);
    }
  }, [isVisible, isDragging]);

  if (!isVisible) {
    return null;
  }

  return (
    <Paper
      ref={panelRef}
      shadow="md"
      radius="md"
      style={{
        position: 'absolute',
        top: actualPosition.y,
        left: actualPosition.x,
        width,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        zIndex,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      <Box
        p="sm"
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          cursor: 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <IconGripVertical size={16} color="gray" />
            <Text size="sm" fw={600} c="dark.8">
              {title}
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={onClose}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label={`Cerrar ${title}`}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Box>
      <Box p="sm">{children}</Box>
    </Paper>
  );
}
