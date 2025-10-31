import type { Position } from "./types.js";

export const NORTH: Position = { x: 0, y: 0, z: -1 };
export const SOUTH: Position = { x: 0, y: 0, z: 1 };
export const EAST: Position = { x: 1, y: 0, z: 0 };
export const WEST: Position = { x: -1, y: 0, z: 0 };
export const UP: Position = { x: 0, y: 1, z: 0 };
export const DOWN: Position = { x: 0, y: -1, z: 0 };

export const HORIZONTAL_OFFSETS: Position[] = [NORTH, SOUTH, EAST, WEST];
export const NEIGHBOR_OFFSETS: Position[] = [...HORIZONTAL_OFFSETS, UP, DOWN];

export const addPos = (a: Position, b: Position): Position => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const posKey = (p: Position): string => `${p.x},${p.y},${p.z}`;

export const parsePos = (key: string): Position => {
  const [x, y, z] = key.split(",").map(Number);
  return { x: x!, y: y!, z: z! };
};
