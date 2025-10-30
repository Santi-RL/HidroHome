import { useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { Box } from '@mantine/core';
import { useElementSize, useMergedRef } from '@mantine/hooks';
import { Layer, Line, Rect, Stage, Text as KonvaText, Group as KonvaGroup } from 'react-konva';
import { CATALOG_DRAG_DATA_KEY } from '../catalog/CatalogPanel';
import { getCatalogItem } from '../../shared/constants/catalog';
import {
  useActiveLinkTemplateId,
  useActiveTool,
  useEditorStore,
  useLinkStartNodeId,
  useNetwork,
  useSelection,
} from '../../shared/state/editorStore';
import type { Vec2 } from '../../shared/types/math';

const DEFAULT_CANVAS_SIZE = { width: 1200, height: 720 };

const gridLines = (size: number, max: number): number[] => {
  const lines: number[] = [];
  for (let i = 0; i <= max; i += size) {
    lines.push(i);
  }
  return lines;
};

export function EditorCanvas() {
  const { ref: measureRef, width, height } = useElementSize<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef<HTMLDivElement>(measureRef, containerRef);
  const network = useNetwork();
  const selection = useSelection();
  const activeTool = useActiveTool();
  const activeLinkTemplateId = useActiveLinkTemplateId();
  const linkStartNodeId = useLinkStartNodeId();
  const [cursorPosition, setCursorPosition] = useState<Vec2 | null>(null);
  const addNode = useEditorStore((state) => state.addNode);
  const updateNodePosition = useEditorStore((state) => state.updateNodePosition);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectLink = useEditorStore((state) => state.selectLink);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setLinkStartNode = useEditorStore((state) => state.setLinkStartNode);
  const completeLinkTo = useEditorStore((state) => state.completeLinkTo);

  const stageWidth = width || DEFAULT_CANVAS_SIZE.width;
  const stageHeight = height || DEFAULT_CANVAS_SIZE.height;

  const verticalLines = useMemo(() => gridLines(50, stageWidth), [stageWidth]);
  const horizontalLines = useMemo(() => gridLines(50, stageHeight), [stageHeight]);

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData(CATALOG_DRAG_DATA_KEY);
    if (!itemId) return;

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position: Vec2 = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    addNode(itemId, position);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes(CATALOG_DRAG_DATA_KEY)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleStageClick = (event: any) => {
    if (event.target === event.target.getStage()) {
      clearSelection();
      if (activeTool === 'connect') {
        setLinkStartNode(null);
      }
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (activeTool === 'connect' && activeLinkTemplateId) {
      if (!linkStartNodeId) {
        setLinkStartNode(nodeId);
      } else {
        completeLinkTo(nodeId);
      }
    } else {
      selectNode(nodeId);
    }
  };

  const handleLinkClick = (linkId: string) => {
    selectLink(linkId);
  };

  const activeTemplate = activeLinkTemplateId ? getCatalogItem(activeLinkTemplateId) : undefined;
  const activeTemplateColor = activeTemplate?.color ?? '#2563eb';

  return (
    <Box
      ref={mergedRef}
      style={{
        borderRadius: 8,
        border: '1px solid var(--mantine-color-gray-4)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Stage
      width={stageWidth}
      height={stageHeight}
      onClick={handleStageClick}
      onMouseMove={(event) => {
        const stage = event.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          setCursorPosition({ x: pointer.x, y: pointer.y });
        }
      }}
      onMouseLeave={() => setCursorPosition(null)}
    >
      <Layer>
        <Rect width={stageWidth} height={stageHeight} fill="#f8fafc" />
        {verticalLines.map((x) => (
          <Line key={`v-${x}`} points={[x, 0, x, stageHeight]} stroke="#e2e8f0" strokeWidth={1} />
        ))}
        {horizontalLines.map((y) => (
          <Line key={`h-${y}`} points={[0, y, stageWidth, y]} stroke="#e2e8f0" strokeWidth={1} />
        ))}
      </Layer>
      <Layer>
        {network.links.map((link) => {
          const fromNode = network.nodes.find((node) => node.id === link.from);
          const toNode = network.nodes.find((node) => node.id === link.to);
          if (!fromNode || !toNode) return null;
          const item = link.deviceId ? getCatalogItem(link.deviceId) : undefined;
          const stroke = item?.color ?? '#0f172a';
          const isSelected = selection?.type === 'link' && selection.id === link.id;
          return (
            <Line
              key={link.id}
              points={[fromNode.position.x, fromNode.position.y, toNode.position.x, toNode.position.y]}
              stroke={stroke}
              strokeWidth={isSelected ? 5 : 4}
              lineCap="round"
              hitStrokeWidth={20}
              dash={link.type === 'valve' ? [12, 6] : undefined}
              onClick={() => handleLinkClick(link.id)}
            />
          );
        })}
        {network.nodes.map((node) => {
          const catalogItem = node.deviceId ? getCatalogItem(node.deviceId) : undefined;
          const fill = catalogItem?.color ?? '#2563eb';
          const footprint = catalogItem?.element === 'node' ? catalogItem.defaults.footprint : { width: 50, height: 50 };
          const isSelected = selection?.type === 'node' && selection.id === node.id;
          const isLinkStart = linkStartNodeId === node.id;
          return (
            <KonvaGroup
              key={node.id}
              x={node.position.x}
              y={node.position.y}
              draggable
              onDragEnd={(event) => {
                const { x, y } = event.target.position();
                updateNodePosition(node.id, { x, y });
              }}
              onClick={() => handleNodeClick(node.id)}
            >
              <Rect
                x={-footprint.width / 2}
                y={-footprint.height / 2}
                width={footprint.width}
                height={footprint.height}
                fill={fill}
                opacity={isSelected ? 0.9 : 0.75}
                cornerRadius={8}
                stroke={isSelected ? '#0f172a' : isLinkStart ? activeTemplateColor : 'transparent'}
                strokeWidth={isSelected || isLinkStart ? 3 : 0}
              />
              <KonvaText
                text={node.label}
                fontSize={14}
                fill="#0f172a"
                align="center"
                width={footprint.width}
                x={-footprint.width / 2}
                y={footprint.height / 2 + 6}
              />
              <KonvaText
                text={`Demand: ${(node.baseDemand * 1000).toFixed(2)} L/s`}
                fontSize={12}
                fill="#1e293b"
                width={footprint.width}
                x={-footprint.width / 2}
                y={footprint.height / 2 + 22}
              />
            </KonvaGroup>
          );
        })}
        {activeTool === 'connect' && linkStartNodeId && cursorPosition && (
          <Line
            points={[
              network.nodes.find((node) => node.id === linkStartNodeId)?.position.x ?? 0,
              network.nodes.find((node) => node.id === linkStartNodeId)?.position.y ?? 0,
              cursorPosition.x,
              cursorPosition.y,
            ]}
            stroke={activeTemplateColor}
            strokeWidth={3}
            dash={[8, 4]}
          />
        )}
      </Layer>
      <Layer>
        <KonvaGroup x={12} y={stageHeight - 40}>
          <Rect width={140} height={32} fill="rgba(15,23,42,0.75)" cornerRadius={6} />
          <KonvaText
            x={8}
            y={8}
            text={
              activeTool === 'connect'
                ? linkStartNodeId
                  ? 'Selecciona destino'
                  : 'Selecciona nodo origen'
                : 'Click para seleccionar'
            }
            fontSize={12}
            fill="#f8fafc"
          />
        </KonvaGroup>
      </Layer>
    </Stage>
    </Box>
  );
}
