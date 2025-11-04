import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { Box } from '@mantine/core';
import { Layer, Line, Rect, Stage, Text as KonvaText, Group as KonvaGroup, Circle } from 'react-konva';
import { CATALOG_DRAG_DATA_KEY } from '../catalog/CatalogPanel';
import { getCatalogItem } from '../../shared/constants/catalog';
import {
  useActiveLinkTemplateId,
  useActiveTool,
  useCurrentTimestep,
  useEditorStore,
  useLinkStartNodeId,
  useNetwork,
  useSelection,
  useSimulationRanges,
} from '../../shared/state/editorStore';
import type { Vec2 } from '../../shared/types/math';
import type { SimulationNodeResult } from '../../shared/types/hydro';
import { computeLinkVisualStyle, computeNodeVisualStyle } from '../simulation/simulationVisualMapping';
import {
  createParticleSystem,
  updateParticleSystem,
  regenerateAllParticles,
  getParticlePosition,
  type ParticleSystemState,
} from './flowParticles';
import {
  createTransition,
  updateTransition,
  lerpColor,
  lerp as lerpValue,
  type TransitionState,
} from './transitionSystem';

const DEFAULT_CANVAS_SIZE = { width: 1200, height: 720 };

const gridLines = (size: number, max: number): number[] => {
  const lines: number[] = [];
  for (let i = 0; i <= max; i += size) {
    lines.push(i);
  }
  return lines;
};

// Formato de número argentino: punto para miles, coma para decimales
const formatNumberAR = (value: number, decimals: number = 2): string => {
  const fixed = value.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${formattedInteger},${decimal}` : formattedInteger;
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
  const [particleSystem, setParticleSystem] = useState<ParticleSystemState>(createParticleSystem());
  const [transition, setTransition] = useState<TransitionState>({
    isTransitioning: false,
    fromTimestepIndex: null,
    toTimestepIndex: null,
    progress: 1,
    startTime: Date.now(),
  });
  const animationFrameRef = useRef<number | null>(null);
  const prevTimestepIndexRef = useRef<number | null>(null);
  const prevStylesRef = useRef<{
    links: Record<string, ReturnType<typeof computeLinkVisualStyle>>;
    nodes: Record<string, ReturnType<typeof computeNodeVisualStyle>>;
  }>({ links: {}, nodes: {} });
  const addNode = useEditorStore((state) => state.addNode);
  const updateNodePosition = useEditorStore((state) => state.updateNodePosition);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectLink = useEditorStore((state) => state.selectLink);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setLinkStartNode = useEditorStore((state) => state.setLinkStartNode);
  const completeLinkTo = useEditorStore((state) => state.completeLinkTo);
  const currentTimestep = useCurrentTimestep();
  const simulationRanges = useSimulationRanges();

  // Detectar cambio de timestep e iniciar transición
  useEffect(() => {
    if (!currentTimestep) {
      prevTimestepIndexRef.current = null;
      return;
    }

    const currentTime = currentTimestep.time;
    
    if (prevTimestepIndexRef.current !== null && prevTimestepIndexRef.current !== currentTime) {
      // Iniciar transición
      setTransition(createTransition(prevTimestepIndexRef.current, currentTime));
    }

    prevTimestepIndexRef.current = currentTime;
  }, [currentTimestep]);

  // Loop de actualización de transición
  useEffect(() => {
    if (!transition.isTransitioning) {
      return;
    }

    const animate = () => {
      setTransition((prev) => updateTransition(prev));
    };

    const frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [transition.isTransitioning]);

  const linkStyles = useMemo(() => {
    if (!currentTimestep || !simulationRanges) return {};
    const styles: Record<string, ReturnType<typeof computeLinkVisualStyle>> = {};
    
    currentTimestep.links.forEach((link) => {
      const newStyle = computeLinkVisualStyle(link, simulationRanges, {
        metric: 'flow',
        highlightIssues: true,
      });

      // Aplicar interpolación si hay transición activa
      if (transition.isTransitioning && prevStylesRef.current.links[link.id]) {
        const prevStyle = prevStylesRef.current.links[link.id];
        styles[link.id] = {
          color: lerpColor(prevStyle.color, newStyle.color, transition.progress),
          width: lerpValue(prevStyle.width, newStyle.width, transition.progress),
          opacity: lerpValue(prevStyle.opacity, newStyle.opacity, transition.progress),
          isCritical: newStyle.isCritical,
          intensity: lerpValue(prevStyle.intensity, newStyle.intensity, transition.progress),
        };
      } else {
        styles[link.id] = newStyle;
      }
    });

    // Guardar estilos actuales para la próxima transición
    if (!transition.isTransitioning) {
      prevStylesRef.current.links = styles;
    }

    return styles;
  }, [currentTimestep, simulationRanges, transition.isTransitioning, transition.progress]);

  const nodeStyles = useMemo(() => {
    if (!currentTimestep || !simulationRanges) return {};
    const styles: Record<string, ReturnType<typeof computeNodeVisualStyle>> = {};
    
    currentTimestep.nodes.forEach((node) => {
      const newStyle = computeNodeVisualStyle(node, simulationRanges, {
        metric: typeof node.tankLevel === 'number' ? 'tankLevel' : 'pressure',
        highlightIssues: true,
      });

      // Aplicar interpolación si hay transición activa
      if (transition.isTransitioning && prevStylesRef.current.nodes[node.id]) {
        const prevStyle = prevStylesRef.current.nodes[node.id];
        styles[node.id] = {
          color: lerpColor(prevStyle.color, newStyle.color, transition.progress),
          width: lerpValue(prevStyle.width, newStyle.width, transition.progress),
          opacity: lerpValue(prevStyle.opacity, newStyle.opacity, transition.progress),
          isCritical: newStyle.isCritical,
          intensity: lerpValue(prevStyle.intensity, newStyle.intensity, transition.progress),
        };
      } else {
        styles[node.id] = newStyle;
      }
    });

    // Guardar estilos actuales para la próxima transición
    if (!transition.isTransitioning) {
      prevStylesRef.current.nodes = styles;
    }

    return styles;
  }, [currentTimestep, simulationRanges, transition.isTransitioning, transition.progress]);

  const nodeResultMap = useMemo(() => {
    if (!currentTimestep) return {};
    const map: Record<string, SimulationNodeResult> = {};
    currentTimestep.nodes.forEach((result) => {
      map[result.id] = result;
    });
    return map;
  }, [currentTimestep]);

  // Regenerar partículas cuando cambia el timestep
  useEffect(() => {
    if (!currentTimestep || !simulationRanges) {
      setParticleSystem(createParticleSystem());
      return;
    }

    const linkResultsMap = new Map(currentTimestep.links.map((link) => [link.id, link]));
    const nodesMap = new Map(network.nodes.map((node) => [node.id, node]));
    const stylesMap = new Map(Object.entries(linkStyles).map(([id, style]) => [id, style]));

    const particles = regenerateAllParticles(network.links, linkResultsMap, nodesMap, stylesMap);

    setParticleSystem({
      particles,
      lastUpdateTime: Date.now(),
    });
  }, [currentTimestep, simulationRanges, network.links, network.nodes, linkStyles]);

  // Loop de animación para actualizar partículas
  useEffect(() => {
    if (!currentTimestep || particleSystem.particles.length === 0) {
      return;
    }

    const animate = () => {
      setParticleSystem((prev) => updateParticleSystem(prev, 1 / 60)); // 60 FPS
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentTimestep, particleSystem.particles.length]);

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
            const style = linkStyles[link.id];
            const stroke = style?.color ?? item?.color ?? '#0f172a';
            const isSelected = selection?.type === 'link' && selection.id === link.id;
            const strokeWidth = (style?.width ?? 4) + (isSelected ? 1.5 : 0);

            // Calcular dirección del flujo para las flechas
            const linkResult = currentTimestep?.links.find((lr) => lr.id === link.id);
            const hasFlow = linkResult && Math.abs(linkResult.flow) > 0.001;
            const flowReversed = linkResult && linkResult.flow < 0;

            // Calcular puntos para las flechas (en el punto medio del enlace)
            const dx = toNode.position.x - fromNode.position.x;
            const dy = toNode.position.y - fromNode.position.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Posición de la flecha (en el centro de la tubería)
            const arrowX = fromNode.position.x + dx * 0.5;
            const arrowY = fromNode.position.y + dy * 0.5;
            
            // Tamaño de la flecha basado en el grosor de la tubería
            const arrowSize = Math.max(8, strokeWidth * 1.5);
            
            // Calcular puntos de la flecha (triángulo)
            const arrowAngle = flowReversed ? angle + Math.PI : angle;
            const arrowPoints = [
              // Punta de la flecha
              arrowX + Math.cos(arrowAngle) * arrowSize,
              arrowY + Math.sin(arrowAngle) * arrowSize,
              // Base izquierda
              arrowX + Math.cos(arrowAngle + Math.PI * 2.5 / 3) * arrowSize * 0.7,
              arrowY + Math.sin(arrowAngle + Math.PI * 2.5 / 3) * arrowSize * 0.7,
              // Base derecha
              arrowX + Math.cos(arrowAngle - Math.PI * 2.5 / 3) * arrowSize * 0.7,
              arrowY + Math.sin(arrowAngle - Math.PI * 2.5 / 3) * arrowSize * 0.7,
            ];

            return (
              <KonvaGroup key={link.id}>
                <Line
                  points={[fromNode.position.x, fromNode.position.y, toNode.position.x, toNode.position.y]}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={style?.opacity ?? 0.85}
                  lineCap="round"
                  hitStrokeWidth={20}
                  dash={link.type === 'valve' ? [12, 6] : undefined}
                  shadowColor={style?.isCritical ? '#f87171' : undefined}
                  shadowBlur={style?.isCritical ? 12 : 0}
                  shadowOpacity={style?.isCritical ? 0.9 : 0}
                  onClick={() => handleLinkClick(link.id)}
                />
                {/* Flecha direccional del flujo */}
                {hasFlow && length > 40 && (
                  <Line
                    points={arrowPoints}
                    closed
                    fill={stroke}
                    opacity={(style?.opacity ?? 0.85) * 0.9}
                    strokeWidth={0}
                    listening={false}
                  />
                )}
              </KonvaGroup>
            );
          })}
          {network.nodes.map((node) => {
            const catalogItem = node.deviceId ? getCatalogItem(node.deviceId) : undefined;
            const style = nodeStyles[node.id];
            const fill = style?.color ?? catalogItem?.color ?? '#2563eb';
            const footprint =
              catalogItem?.element === 'node'
                ? catalogItem.defaults.footprint
                : { width: 50, height: 50 };
            const isSelected = selection?.type === 'node' && selection.id === node.id;
            const isLinkStart = linkStartNodeId === node.id;
            const baseOpacity = style?.opacity ?? 0.75;
            const nodeResult = nodeResultMap[node.id];
            const pressureText =
              nodeResult && Number.isFinite(nodeResult.pressure)
                ? `Presión: ${formatNumberAR(nodeResult.pressure, 2)} kPa`
                : 'Presión: --';
            const demandLps =
              nodeResult && Number.isFinite(nodeResult.demand)
                ? nodeResult.demand
                : node.baseDemand * 1000;
            const demandText = `Demanda: ${formatNumberAR(demandLps, 3)} L/s`;
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
                  opacity={isSelected ? Math.min(baseOpacity + 0.2, 1) : baseOpacity}
                  cornerRadius={8}
                  stroke={isSelected ? '#0f172a' : isLinkStart ? activeTemplateColor : style?.isCritical ? '#dc2626' : 'transparent'}
                  strokeWidth={isSelected || isLinkStart ? 3 : 0}
                  shadowColor={style?.isCritical ? '#f87171' : undefined}
                  shadowOpacity={style?.isCritical ? 0.9 : 0}
                  shadowBlur={style?.isCritical ? 16 : 0}
                />
                {/* Indicador de nivel de tanque */}
                {node.type === 'tank' && nodeResult && typeof nodeResult.tankLevel === 'number' && simulationRanges?.tankLevel && (
                  <>
                    {/* Contenedor del indicador de nivel */}
                    <Rect
                      x={-footprint.width / 2 + 8}
                      y={-footprint.height / 2 + 8}
                      width={12}
                      height={footprint.height - 16}
                      fill="rgba(255, 255, 255, 0.3)"
                      cornerRadius={4}
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth={1.5}
                    />
                    {/* Nivel de agua (relleno desde abajo) */}
                    {(() => {
                      const levelRange = simulationRanges.tankLevel;
                      const minLevel = levelRange.min;
                      const maxLevel = levelRange.max;
                      const levelPercent = maxLevel > minLevel 
                        ? Math.max(0, Math.min(1, (nodeResult.tankLevel - minLevel) / (maxLevel - minLevel)))
                        : 0.5;
                      const barHeight = (footprint.height - 16) * levelPercent;
                      const barY = -footprint.height / 2 + 8 + (footprint.height - 16 - barHeight);
                      
                      // Color del agua basado en el nivel
                      const waterColor = levelPercent > 0.7 
                        ? '#3b82f6' // Azul brillante (nivel alto)
                        : levelPercent > 0.3 
                        ? '#06b6d4' // Cyan (nivel medio)
                        : '#f59e0b'; // Ámbar (nivel bajo)
                      
                      return barHeight > 0 ? (
                        <Rect
                          x={-footprint.width / 2 + 8}
                          y={barY}
                          width={12}
                          height={barHeight}
                          fill={waterColor}
                          cornerRadius={4}
                          opacity={0.85}
                        />
                      ) : null;
                    })()}
                    {/* Texto del nivel */}
                    <Rect
                      x={footprint.width / 2 - 50}
                      y={-footprint.height / 2 + 8}
                      width={42}
                      height={20}
                      fill="rgba(15, 23, 42, 0.85)"
                      cornerRadius={4}
                    />
                    <KonvaText
                      text={`${formatNumberAR(nodeResult.tankLevel, 1)}m`}
                      fontSize={10}
                      fontStyle="bold"
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      width={42}
                      height={20}
                      x={footprint.width / 2 - 50}
                      y={-footprint.height / 2 + 8}
                    />
                  </>
                )}
                {/* Label con fondo */}
                <Rect
                  x={-65}
                  y={footprint.height / 2 + 8}
                  width={130}
                  height={22}
                  fill="white"
                  opacity={0.95}
                  cornerRadius={4}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowBlur={6}
                  shadowOffsetY={2}
                />
                <KonvaText
                  text={node.label}
                  fontSize={13}
                  fontStyle="bold"
                  fill="#0f172a"
                  align="center"
                  verticalAlign="middle"
                  width={130}
                  height={22}
                  x={-65}
                  y={footprint.height / 2 + 8}
                />
                {/* Datos de simulación con fondo */}
                {nodeResult && (
                  <>
                    <Rect
                      x={-65}
                      y={footprint.height / 2 + 36}
                      width={130}
                      height={node.type === 'fixture' || node.baseDemand > 0 ? 44 : 22}
                      fill="white"
                      opacity={0.9}
                      cornerRadius={4}
                      shadowColor="rgba(0,0,0,0.12)"
                      shadowBlur={4}
                      shadowOffsetY={2}
                    />
                    <KonvaText
                      text={pressureText}
                      fontSize={11}
                      fill="#1e293b"
                      align="center"
                      verticalAlign="middle"
                      width={130}
                      height={22}
                      x={-65}
                      y={footprint.height / 2 + 36}
                    />
                    {(node.type === 'fixture' || node.baseDemand > 0) && (
                      <KonvaText
                        text={demandText}
                        fontSize={10}
                        fill="#475569"
                        align="center"
                        verticalAlign="middle"
                        width={130}
                        height={22}
                        x={-65}
                        y={footprint.height / 2 + 58}
                      />
                    )}
                  </>
                )}
              </KonvaGroup>
            );
          })}
          {/* Partículas de flujo animadas */}
          {particleSystem.particles.map((particle) => {
            const link = network.links.find((l) => l.id === particle.linkId);
            if (!link) return null;
            const fromNode = network.nodes.find((node) => node.id === link.from);
            const toNode = network.nodes.find((node) => node.id === link.to);
            if (!fromNode || !toNode) return null;
            
            const position = getParticlePosition(particle, fromNode, toNode);
            
            return (
              <Circle
                key={particle.id}
                x={position.x}
                y={position.y}
                radius={particle.size}
                fill={particle.color}
                opacity={particle.opacity}
                shadowColor="#ffffff"
                shadowBlur={12}
                shadowOpacity={0.8}
                listening={false}
              />
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
