import { Engine, Position, OpaqueBlock, Piston, RedstoneDust, Lever } from "block";

const at = (x: number, y: number, z: number) => new Position(x, y, z);

export function build(engine: Engine): void {
  // --- Helpers ---
  const placeSolid = (x: number, y: number, z: number) => {
    engine.setBlock(at(x, y, z), new OpaqueBlock());
  };
  const placeDust = (x: number, y: number, z: number) => {
    engine.setBlock(at(x, y, z), new RedstoneDust());
  };
  const placePiston = (x: number, y: number, z: number, facing: Position) => {
    engine.setBlock(at(x, y, z), new Piston(facing));
  };
  const placeLever = (x: number, y: number, z: number, attach: Position) => {
    engine.setBlock(at(x, y, z), new Lever(attach));
  };

  // --- Static supports (floors for dust) ---
  for (let x = -6; x <= 6; x++) {
    for (let z = -3; z <= 3; z++) {
      placeSolid(x, -2, z); // supports dust at y=-1
      placeSolid(x, -1, z); // supports dust at y=0
    }
  }

  // --- Door (2×2), closed at x=0 plane, y=0..1, z=0..1 ---
  const doorCoords: Array<[number,number,number]> = [[0,0,0],[0,1,0],[0,0,1],[0,1,1]];
  doorCoords.forEach(([x,y,z]) => placeSolid(x,y,z));

  // --- Pistons: left bank (open), right bank (close) ---
  const EAST = new Position(1,0,0);
  const WEST = new Position(-1,0,0);

  const leftBank: Array<[number,number,number]> = [
    [-1,0,0],[-1,1,0],[-1,0,1],[-1,1,1]
  ];
  leftBank.forEach(([x,y,z]) => placePiston(x,y,z, EAST));

  const rightBank: Array<[number,number,number]> = [
    [2,0,0],[2,1,0],[2,0,1],[2,1,1]
  ];
  rightBank.forEach(([x,y,z]) => placePiston(x,y,z, WEST));

  // Power solids adjacent to pistons (west of left bank, east of right bank)
  const leftPower: Array<[number,number,number]> = [[-2,0,0],[-2,1,0],[-2,0,1],[-2,1,1]];
  leftPower.forEach(([x,y,z]) => placeSolid(x,y,z));
  const rightPower: Array<[number,number,number]> = [[3,0,0],[3,1,0],[3,0,1],[3,1,1]];
  rightPower.forEach(([x,y,z]) => placeSolid(x,y,z));

  // Dust near power solids (weakly powers them)
  const leftPads: Array<[number,number,number]> = [[-3,0,0],[-3,1,0],[-3,0,1],[-3,1,1]];
  leftPads.forEach(([x,y,z]) => placeDust(x,y,z));
  const rightPads: Array<[number,number,number]> = [[4,0,0],[4,1,0],[4,0,1],[4,1,1]];
  rightPads.forEach(([x,y,z]) => placeDust(x,y,z));

  // --- Lever (single input) and main bus (y=-1) ---
  // clear support at lever cell, keep attachment block below
  engine.removeBlock(at(-4,-1,-2));
  placeLever(-4,-1,-2, new Position(0,-1,0)); // attach to solid below
  placeDust(-3,-1,-2);
  for (let x = -3; x <= 1; x++) placeDust(x,-1,-1);
  placeDust(1,-1,0); // branch node
  placeDust(0,-1,0); // branch node for close rail

  // --- Geometry-gated step bridges (use cellV cuts by door at x=0/x=1) ---
  // OPEN rail (to left bank): L1=(1,-1,0), U1=(2,0,0), cut when door at (1,0,0)
  placeDust(1,-1,0); // lower
  placeDust(2,0,0);  // upper
  // CLOSE rail (to right bank): L2=(0,-1,0), U2=(-1,0,0), cut when door at (0,0,0)
  placeDust(0,-1,0); // lower
  placeDust(-1,0,0); // upper

  // --- Route from step-bridge uppers to banks via service corridor z=-2 at y=0 ---
  // from U1 (2,0,0) → corridor and then to left bank dust pads
  const toLeftCorridor: Array<[number,number,number]> = [[2,0,-1],[1,0,-2],[0,0,-2],[-1,0,-2],[-2,0,-2],[-3,0,-2]];
  toLeftCorridor.forEach(([x,y,z]) => placeDust(x,y,z));
  // spur to left bank pads
  const leftSpur: Array<[number,number,number]> = [[-3,0,-1],[-3,1,-1],[-3,0,0],[-3,1,0],[-3,0,1],[-3,1,1]];
  leftSpur.forEach(([x,y,z]) => placeDust(x,y,z));

  // from U2 (-1,0,0) → corridor and then to right bank dust pads
  const toRightCorridor: Array<[number,number,number]> = [[-1,0,-1],[0,0,-2],[1,0,-2],[2,0,-2],[3,0,-2],[4,0,-2]];
  toRightCorridor.forEach(([x,y,z]) => placeDust(x,y,z));
  // spur to right bank pads
  const rightSpur: Array<[number,number,number]> = [[4,0,-1],[4,1,-1],[4,0,0],[4,1,0],[4,0,1],[4,1,1]];
  rightSpur.forEach(([x,y,z]) => placeDust(x,y,z));
}


