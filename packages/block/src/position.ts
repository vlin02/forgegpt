import type { Position } from "./types.js";

export const NEIGHBOR_OFFSETS: Position[] = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];

export const HORIZONTAL_OFFSETS: Position[] = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
];

export const DOWN: Position = { x: 0, y: -1, z: 0 };

export const addPos = (a: Position, b: Position): Position => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const posKey = (p: Position): string => `${p.x},${p.y},${p.z}`;
