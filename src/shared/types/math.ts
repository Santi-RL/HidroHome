export interface Vec2 {
  x: number;
  y: number;
}

export const zeroVec2 = (): Vec2 => ({ x: 0, y: 0 });

export const addVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const subtractVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export const scaleVec2 = (v: Vec2, scalar: number): Vec2 => ({
  x: v.x * scalar,
  y: v.y * scalar,
});

export const distanceVec2 = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
