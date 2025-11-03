import { Builder, Engine, Position, EAST as E, WEST as W, UP as U, DOWN as D } from "block";

export function build(engine: Engine): void {
  const b = new Builder(engine);

  const at = (x: number, y: number, z: number) => new Position(x, y, z);

  // floor/support for dust and lever
  for (let x = -4; x <= 4; x++) {
    for (let z = -1; z <= 3; z++) {
      b.move(at(x, 0, z)).solid();
    }
  }

  // doorway frame (not strictly necessary for engine, but good reference)
  // left/right pillars
  for (let y = 1; y <= 3; y++) {
    b.move(at(-1, y, -1)).solid();
    b.move(at(2, y, -1)).solid();
  }
  // lintel
  for (let x = -1; x <= 2; x++) {
    b.move(at(x, 3, -1)).solid();
  }

  // 2×2 door blocks positioned at x=0..1, y=1..2, z=0 (closed state)
  const doorCoords: Array<[number, number, number]> = [
    [0, 1, 0],
    [1, 1, 0],
    [0, 2, 0],
    [1, 2, 0],
  ];
  for (const [x, y, z] of doorCoords) b.move(at(x, y, z)).solid();

  // Left bank: 4 pistons at x=-1 facing east to push door out to x=1→2 (open)
  const leftPistons: Array<[number, number, number]> = [
    [-1, 1, 0],
    [-1, 2, 0],
    [-1, 1, 1],
    [-1, 2, 1],
  ];
  for (const [x, y, z] of leftPistons) b.move(at(x, y, z)).piston(E);

  // Right bank: 4 pistons at x=2 facing west to push door back to closed
  const rightPistons: Array<[number, number, number]> = [
    [2, 1, 0],
    [2, 2, 0],
    [2, 1, 1],
    [2, 2, 1],
  ];
  for (const [x, y, z] of rightPistons) b.move(at(x, y, z)).piston(W);

  // dust rails above left pistons (QC powering)
  // supports for dust (y=1 under dust at y=2)
  for (const [x, y, z] of leftPistons) b.move(at(x, 1, z)).solid();
  // dust above each left piston
  for (const [x, _y, z] of leftPistons) b.move(at(x, 2, z)).dust();

  // main bus at y=2 from lever to left rail
  for (let x = -3; x <= -1; x++) b.move(at(x, 2, 0)).dust();

  // lever attached to floor block at (-3,1,0)
  b.move(at(-3, 1, 0)).lever(D);
}


