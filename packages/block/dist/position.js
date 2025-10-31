export const NEIGHBOR_OFFSETS = [
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
];
export const HORIZONTAL_OFFSETS = [
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
];
export const DOWN = { x: 0, y: -1, z: 0 };
export const addPos = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
});
export const posKey = (p) => `${p.x},${p.y},${p.z}`;
//# sourceMappingURL=position.js.map