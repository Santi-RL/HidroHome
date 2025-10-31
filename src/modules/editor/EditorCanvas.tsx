import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { Box } from '@mantine/core';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const network = useNetwork();
  const selection = useSelection();
  const activeTool = useActiveTool();
  const activeLinkTemplateId = useActiveLinkTemplateId();
  const linkStartNodeId = useLinkStartNodeId();
  const [cursorPosition, setCursorPosition] = useState<Vec2 | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState<Vec2>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: DEFAULT_CANVAS_SIZE.width, height: DEFAULT_CANVAS_SIZE.height });
  const addNode = useEditorStore((state) => state.addNode);
  const updateNodePosition = useEditorStore((state) => state.updateNodePosition);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectLink = useEditorStore((state) => state.selectLink);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setLinkStartNode = useEditorStore((state) => state.setLinkStartNode);
  const completeLinkTo = useEditorStore((state) => state.completeLinkTo);

  // Medir el contenedor solo una vez cuando cambia su tamaño real (resize del viewport)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Usar contentRect que es más estable que clientWidth/Height
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const stageWidth = dimensions.width;
  const stageHeight = dimensions.height;

  const verticalLines = useMemo(() => gridLines(50, stageWidth), [stageWidth]);
  const horizontalLines = useMemo(() => gridLines(50, stageHeight), [stageHeight]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
        setIsPanning(false);
      }
    };

    const handleBlur = () => {
      setIsShiftPressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const toStageCoordinates = (point: Vec2): Vec2 => ({
    x: (point.x - stagePosition.x) / stageScale,
    y: (point.y - stagePosition.y) / stageScale,
  });

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData(CATALOG_DRAG_DATA_KEY);
    if (!itemId) return;

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const containerPoint: Vec2 = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const position = toStageCoordinates(containerPoint);
    addNode(itemId, position);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes(CATALOG_DRAG_DATA_KEY)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleStageClick = (event: any) => {
    if (isShiftPressed) return;
    if (event.target === event.target.getStage()) {
      clearSelection();
      if (activeTool === 'connect') {
        setLinkStartNode(null);
      }
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (isShiftPressed) return;
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
    if (isShiftPressed) return;
    selectLink(linkId);
  };

  const activeTemplate = activeLinkTemplateId ? getCatalogItem(activeLinkTemplateId) : undefined;
  const activeTemplateColor = activeTemplate?.color ?? '#2563eb';

  return (
    <Box
      ref={containerRef}
      style={{
        borderRadius: 8,
        border: '1px solid var(--mantine-color-gray-4)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isShiftPressed ? (isPanning ? 'grabbing' : 'grab') : 'default',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Stage
        width={stageWidth}
        height={stageHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={isShiftPressed}
        onClick={handleStageClick}
        onMouseMove={(event) => {
          const stage = event.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (pointer) {
            setCursorPosition(toStageCoordinates(pointer));
          }
        }}
        onMouseLeave={() => setCursorPosition(null)}
        onDragStart={() => setIsPanning(true)}
        onDragMove={(event) => {
          const stage = event.target.getStage();
          if (stage) {
            const position = stage.position();
            setStagePosition({ x: position.x, y: position.y });
          }
        }}
        onDragEnd={(event) => {
          const stage = event.target.getStage();
          if (stage) {
            const position = stage.position();
            setStagePosition({ x: position.x, y: position.y });
          }
          setIsPanning(false);
        }}
        onWheel={(event) => {
          if (!isShiftPressed) return;
          event.evt.preventDefault();
          const stage = event.target.getStage();
          if (!stage) return;
          const pointer = stage.getPointerPosition();
          if (!pointer) return;

          const scaleBy = 1.05;
          const direction = event.evt.deltaY > 0 ? 1 / scaleBy : scaleBy;
          const newScale = Math.min(Math.max(stageScale * direction, 0.3), 5);
          const mousePointTo = toStageCoordinates(pointer);

          const newPosition = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          };

          setStageScale(newScale);
          setStagePosition(newPosition);
        }}
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
            const footprint =
              catalogItem?.element === 'node'
                ? catalogItem.defaults.footprint
                : { width: 50, height: 50 };
            const isSelected = selection?.type === 'node' && selection.id === node.id;
            const isLinkStart = linkStartNodeId === node.id;
            return (
              <KonvaGroup
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                draggable={!isShiftPressed}
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
      </Stage>
      <Box
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          color: '#f8fafc',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 12,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {activeTool === 'connect'
          ? linkStartNodeId
            ? 'Selecciona destino'
            : 'Selecciona nodo origen'
          : 'Click para seleccionar'}
      </Box>
    </Box>
  );
}
