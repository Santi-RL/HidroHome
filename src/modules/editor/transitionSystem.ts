/**
 * Sistema de interpolación para transiciones suaves entre timesteps
 */

/**
 * Interpolación lineal entre dos valores
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Función de suavizado (ease-in-out cúbico)
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Interpolación de colores en formato hex
 */
export const lerpColor = (colorA: string, colorB: string, t: number): string => {
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
        const clamped = Math.max(0, Math.min(255, Math.round(value)));
        return clamped.toString(16).padStart(2, '0');
      })
      .join('')}`;

  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const smoothT = easeInOutCubic(Math.max(0, Math.min(1, t)));

  return rgbToHex(
    lerp(a.r, b.r, smoothT),
    lerp(a.g, b.g, smoothT),
    lerp(a.b, b.b, smoothT)
  );
};

/**
 * Estado de transición entre timesteps
 */
export interface TransitionState {
  /** ¿Está en transición activa? */
  isTransitioning: boolean;
  /** Timestep de origen */
  fromTimestepIndex: number | null;
  /** Timestep de destino */
  toTimestepIndex: number | null;
  /** Progreso de la transición [0-1] */
  progress: number;
  /** Tiempo de inicio de la transición */
  startTime: number;
}

/**
 * Duración de la transición en milisegundos
 */
const TRANSITION_DURATION_MS = 400;

/**
 * Crea un nuevo estado de transición
 */
export const createTransition = (fromIndex: number, toIndex: number): TransitionState => ({
  isTransitioning: true,
  fromTimestepIndex: fromIndex,
  toTimestepIndex: toIndex,
  progress: 0,
  startTime: Date.now(),
});

/**
 * Actualiza el progreso de una transición
 */
export const updateTransition = (transition: TransitionState): TransitionState => {
  if (!transition.isTransitioning) {
    return transition;
  }

  const elapsed = Date.now() - transition.startTime;
  const progress = Math.min(1, elapsed / TRANSITION_DURATION_MS);

  return {
    ...transition,
    progress,
    isTransitioning: progress < 1,
  };
};

/**
 * Interpola entre dos valores de resultados de simulación
 */
export const interpolateSimulationValue = (
  valueA: number,
  valueB: number,
  transition: TransitionState
): number => {
  if (!transition.isTransitioning) {
    return valueB;
  }

  return lerp(valueA, valueB, easeInOutCubic(transition.progress));
};
