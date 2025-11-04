import type {
  SimulationLinkResult,
  SimulationNodeResult,
  SimulationRanges,
} from '../../shared/types/hydro';

export type VisualMetric = 'pressure' | 'flow' | 'velocity' | 'tankLevel';

export interface VisualStyleOptions {
  metric: VisualMetric;
  inverted?: boolean;
  highlightIssues?: boolean;
}

export interface VisualStyleResult {
  color: string;
  width: number;
  opacity: number;
  isCritical: boolean;
  intensity: number;
}

const DEFAULT_MIN_COLOR = '#1e40af'; // Azul oscuro para mejor contraste con partículas claras
const DEFAULT_MAX_COLOR = '#c2410c'; // Naranja oscuro (mejor contraste)
const CRITICAL_COLOR = '#b91c1c'; // Rojo oscuro

const MIN_WIDTH = 6; // Grosor mínimo aumentado para mejor visibilidad
const MAX_WIDTH = 16; // Grosor máximo aumentado significativamente

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const easeInOut = (t: number) => {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return -1 + (4 - 2 * t) * t;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => {
      const clamped = clamp(Math.round(value), 0, 255);
      return clamped.toString(16).padStart(2, '0');
    })
    .join('')}`;

const interpolateColor = (colorA: string, colorB: string, t: number) => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const blend = easeInOut(clamp(t, 0, 1));
  const r = lerp(a.r, b.r, blend);
  const g = lerp(a.g, b.g, blend);
  const bColor = lerp(a.b, b.b, blend);
  return rgbToHex(r, g, bColor);
};

const normalizeValue = (value: number, min: number, max: number, inverted = false) => {
  if (max <= min) {
    return 0;
  }
  const normalized = (value - min) / (max - min);
  const clamped = clamp(normalized, 0, 1);
  return inverted ? 1 - clamped : clamped;
};

const detectLinkCriticality = (
  link: SimulationLinkResult,
  ranges: SimulationRanges,
  highlightIssues: boolean | undefined,
) => {
  if (!highlightIssues) {
    return false;
  }
  const hasFlow = ranges.flow.max > 0;
  const absoluteFlow = Math.abs(link.flow);
  if (!hasFlow && absoluteFlow === 0) {
    return true;
  }

  const velocityThreshold = ranges.velocity.max * 0.05;
  return absoluteFlow === 0 || (Number.isFinite(velocityThreshold) && link.velocity < velocityThreshold);
};

const detectNodeCriticality = (
  node: SimulationNodeResult,
  ranges: SimulationRanges,
  highlightIssues: boolean | undefined,
) => {
  if (!highlightIssues) {
    return false;
  }

  const pressureThreshold = ranges.pressure.max * 0.05;
  return node.pressure <= pressureThreshold;
};

export const computeLinkVisualStyle = (
  link: SimulationLinkResult,
  ranges: SimulationRanges,
  options: VisualStyleOptions,
): VisualStyleResult => {
  const metricRange =
    options.metric === 'velocity'
      ? ranges.velocity
      : options.metric === 'pressure'
      ? ranges.pressure
      : ranges.flow;

  const rawValue =
    options.metric === 'velocity'
      ? Math.abs(link.velocity)
      : options.metric === 'pressure'
      ? Math.abs(link.headloss)
      : Math.abs(link.flow);

  const intensity = normalizeValue(rawValue, metricRange.min, metricRange.max, options.inverted);
  const isCritical = detectLinkCriticality(link, ranges, options.highlightIssues);
  const color = isCritical
    ? CRITICAL_COLOR
    : interpolateColor(DEFAULT_MIN_COLOR, DEFAULT_MAX_COLOR, intensity);
  const width = lerp(MIN_WIDTH, MAX_WIDTH, intensity);
  const opacity = clamp(isCritical ? 0.7 : 0.45 + intensity * 0.25, 0.45, 0.75); // Más transparente (0.45-0.75)

  return {
    color,
    width,
    opacity,
    isCritical,
    intensity,
  };
};

export const computeNodeVisualStyle = (
  node: SimulationNodeResult,
  ranges: SimulationRanges,
  options: VisualStyleOptions,
): VisualStyleResult => {
  const metricRange =
    options.metric === 'tankLevel' && ranges.tankLevel ? ranges.tankLevel : ranges.pressure;
  const rawValue =
    options.metric === 'tankLevel' && typeof node.tankLevel === 'number'
      ? node.tankLevel
      : node.pressure;

  const intensity = normalizeValue(rawValue, metricRange.min, metricRange.max, options.inverted);
  const isCritical = detectNodeCriticality(node, ranges, options.highlightIssues);

  const color = isCritical
    ? CRITICAL_COLOR
    : interpolateColor(DEFAULT_MIN_COLOR, DEFAULT_MAX_COLOR, intensity);
  const width = lerp(MIN_WIDTH, MAX_WIDTH, intensity * 0.6);
  const opacity = clamp(isCritical ? 1 : 0.5 + intensity * 0.5, 0.2, 1);

  return {
    color,
    width,
    opacity,
    isCritical,
    intensity,
  };
};

export const computeLegendStops = (
  ranges: SimulationRanges,
  metric: VisualMetric,
  steps = 5,
): Array<{ value: number; color: string }> => {
  const range =
    metric === 'velocity'
      ? ranges.velocity
      : metric === 'pressure'
      ? ranges.pressure
      : ranges.flow;

  const min = Math.min(range.min, range.max);
  const max = Math.max(range.min, range.max);
  const normalizedSteps = Math.max(steps, 2);

  const stops: Array<{ value: number; color: string }> = [];
  for (let i = 0; i < normalizedSteps; i += 1) {
    const t = i / (normalizedSteps - 1);
    const value = lerp(min, max, t);
    stops.push({
      value,
      color: interpolateColor(DEFAULT_MIN_COLOR, DEFAULT_MAX_COLOR, t),
    });
  }
  return stops;
};
