/**
 * Sistema de partículas para animación de flujo en tuberías
 */

import type { Vec2 } from '../../shared/types/math';
import type { HydroLink, HydroNode, SimulationLinkResult } from '../../shared/types/hydro';

export interface FlowParticle {
  /** Identificador único de la partícula */
  id: string;
  /** ID del enlace al que pertenece */
  linkId: string;
  /** Posición actual (interpolada entre from y to) [0-1] */
  progress: number;
  /** Velocidad de avance (basada en flow/velocity) */
  speed: number;
  /** Tamaño de la partícula */
  size: number;
  /** Color de la partícula */
  color: string;
  /** Opacidad de la partícula */
  opacity: number;
}

export interface ParticleSystemState {
  particles: FlowParticle[];
  lastUpdateTime: number;
}

/**
 * Crea un nuevo sistema de partículas vacío
 */
export const createParticleSystem = (): ParticleSystemState => ({
  particles: [],
  lastUpdateTime: Date.now(),
});

/**
 * Calcula la velocidad de la partícula basada en el flujo
 * @param flow Flujo en L/s
 * @param velocity Velocidad en m/s
 * @returns Velocidad normalizada para avance de partícula [0.001 - 0.05]
 */
const calculateParticleSpeed = (flow: number, velocity: number): number => {
  const absFlow = Math.abs(flow);
  const absVelocity = Math.abs(velocity);
  
  // Si no hay flujo, velocidad mínima para mostrar que está estancado
  if (absFlow < 0.001) {
    return 0;
  }
  
  // Normalizar velocidad a un rango visual razonable
  // Velocidad típica en tuberías residenciales: 0.5 - 3 m/s
  const normalizedVelocity = Math.min(absVelocity / 3, 1);
  
  // Mapear a velocidad de partícula (progreso por segundo)
  // Rango: 0.005 (muy lento) a 0.08 (muy rápido)
  return 0.005 + normalizedVelocity * 0.075;
};

/**
 * Determina el color de la partícula basado en la intensidad del flujo
 * Las partículas son siempre claras/blancas para contrastar con las tuberías oscuras
 */
const getParticleColor = (intensity: number, isCritical: boolean): string => {
  if (isCritical) {
    return '#fca5a5'; // Rosa claro para problemas críticos (contrasta con tubería roja)
  }
  
  // Partículas en tonos claros que contrastan con tuberías oscuras
  // Más intensidad = más brillante
  if (intensity < 0.3) {
    return '#e0f2fe'; // Azul muy claro
  } else if (intensity < 0.6) {
    return '#dbeafe'; // Azul claro
  } else {
    return '#ffffff'; // Blanco puro para alta intensidad
  }
};

/**
 * Calcula el número de partículas a generar por enlace
 */
const calculateParticleCount = (flow: number, linkLength: number): number => {
  const absFlow = Math.abs(flow);
  
  // Sin flujo, no hay partículas
  if (absFlow < 0.001) {
    return 0;
  }
  
  // Más flujo = más partículas (1-6 partículas por enlace)
  // También considerar longitud: enlaces más largos tienen más partículas
  const baseCount = Math.ceil(absFlow / 10); // 1 partícula cada 10 L/s
  const lengthFactor = Math.max(1, Math.floor(linkLength / 100)); // 1 extra cada 100px
  
  return Math.min(baseCount + lengthFactor, 8);
};

/**
 * Genera nuevas partículas para un enlace específico
 */
export const generateParticlesForLink = (
  link: HydroLink,
  linkResult: SimulationLinkResult,
  fromNode: HydroNode,
  toNode: HydroNode,
  intensity: number,
  isCritical: boolean,
): FlowParticle[] => {
  const dx = toNode.position.x - fromNode.position.x;
  const dy = toNode.position.y - fromNode.position.y;
  const linkLength = Math.sqrt(dx * dx + dy * dy);
  
  const particleCount = calculateParticleCount(linkResult.flow, linkLength);
  const speed = calculateParticleSpeed(linkResult.flow, linkResult.velocity);
  const color = getParticleColor(intensity, isCritical);
  
  // Determinar dirección del flujo
  const isReversed = linkResult.flow < 0;
  
  const particles: FlowParticle[] = [];
  
  // Distribuir partículas uniformemente a lo largo del enlace
  for (let i = 0; i < particleCount; i++) {
    const progress = i / particleCount;
    
    particles.push({
      id: `${link.id}_p${i}`,
      linkId: link.id,
      progress: isReversed ? 1 - progress : progress,
      speed: isReversed ? -speed : speed,
      size: 5 + intensity * 3, // Tamaño: 5-8px, más grande para mejor visibilidad
      color,
      opacity: 0.95, // Opacidad alta para partículas brillantes
    });
  }
  
  return particles;
};

/**
 * Actualiza el sistema de partículas basado en el tiempo transcurrido
 */
export const updateParticleSystem = (
  state: ParticleSystemState,
  deltaTime: number,
): ParticleSystemState => {
  const now = Date.now();
  const dt = deltaTime || (now - state.lastUpdateTime) / 1000; // Convertir a segundos
  
  const updatedParticles = state.particles.map((particle) => {
    let newProgress = particle.progress + particle.speed * dt;
    
    // Ciclar las partículas cuando llegan al final
    if (particle.speed > 0 && newProgress > 1) {
      newProgress = newProgress - 1;
    } else if (particle.speed < 0 && newProgress < 0) {
      newProgress = 1 + newProgress;
    }
    
    return {
      ...particle,
      progress: newProgress,
    };
  });
  
  return {
    particles: updatedParticles,
    lastUpdateTime: now,
  };
};

/**
 * Calcula la posición visual de una partícula en el canvas
 */
export const getParticlePosition = (
  particle: FlowParticle,
  fromNode: HydroNode,
  toNode: HydroNode,
): Vec2 => {
  const t = particle.progress;
  return {
    x: fromNode.position.x + (toNode.position.x - fromNode.position.x) * t,
    y: fromNode.position.y + (toNode.position.y - fromNode.position.y) * t,
  };
};

/**
 * Regenera todas las partículas para el timestep actual
 */
export const regenerateAllParticles = (
  links: HydroLink[],
  linkResults: Map<string, SimulationLinkResult>,
  nodes: Map<string, HydroNode>,
  linkStyles: Map<string, { intensity: number; isCritical: boolean }>,
): FlowParticle[] => {
  const allParticles: FlowParticle[] = [];
  
  links.forEach((link) => {
    const result = linkResults.get(link.id);
    const fromNode = nodes.get(link.from);
    const toNode = nodes.get(link.to);
    const style = linkStyles.get(link.id);
    
    if (result && fromNode && toNode && style) {
      const particles = generateParticlesForLink(
        link,
        result,
        fromNode,
        toNode,
        style.intensity,
        style.isCritical,
      );
      allParticles.push(...particles);
    }
  });
  
  return allParticles;
};
