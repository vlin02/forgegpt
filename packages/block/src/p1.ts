import { Engine } from "./engine.js";
import { Position } from "./position.js";
import { OpaqueBlock, Piston, Lever, RedstoneDust } from "./blocks.js";

export type DoorBuild = {
  engine: Engine;
  leverPos: Position;
  doorBlocks: OpaqueBlock[];
  toggle: () => void;
  isClosed: () => boolean;
  isOpen: () => boolean;
};

function set(engine: Engine, x: number, y: number, z: number, block: any) {
  engine.setBlock(new Position(x, y, z), block);
  return block;
}

function line(engine: Engine, from: Position, to: Position, y: number, place: (p: Position) => void) {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minZ = Math.min(from.z, to.z);
  const maxZ = Math.max(from.z, to.z);
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      place(new Position(x, y, z));
    }
  }
}

export function buildSingleLever2x2Translator(engine: Engine = new Engine()): DoorBuild {
  const door: OpaqueBlock[] = [];

  // Door blocks (closed in doorway at x=0)
  for (const y of [1, 2]) {
    for (const z of [0, 1]) {
      door.push(set(engine, 0, y, z, new OpaqueBlock()));
    }
  }

  // West pistons (push east) at x=-1
  for (const y of [1, 2]) {
    for (const z of [0, 1]) {
      set(engine, -1, y, z, new Piston(new Position(1, 0, 0)));
    }
  }

  // East pistons (push west) at x=2
  for (const y of [1, 2]) {
    for (const z of [0, 1]) {
      set(engine, 2, y, z, new Piston(new Position(-1, 0, 0)));
    }
  }

  // Adjacent powered blocks for pistons (west side at x=-2, east side at x=3)
  for (const y of [1, 2]) {
    for (const z of [0, 1]) {
      set(engine, -2, y, z, new OpaqueBlock());
      set(engine, 3, y, z, new OpaqueBlock());
    }
  }

  // Lower dust path (y=2) to power ONLY west pistons' adjacent blocks at x=-2
  // Supports at y=1
  line(engine, new Position(-2, 0, 0), new Position(-2, 0, 3), 1, p => set(engine, p.x, 1, p.z, new OpaqueBlock()));
  // Dust column on x=-2 from z=0..3
  for (const z of [0, 1, 2, 3]) set(engine, -2, 2, z, new RedstoneDust());

  // Single lever powering the bus at (-4,2,3) attached down to support at (-4,1,3)
  set(engine, -4, 1, 3, new OpaqueBlock());
  const lever = set(engine, -4, 2, 3, new Lever(new Position(0, -1, 0)));

  // Join lever to bus at (-3,2,3) -> (-2,2,3)
  set(engine, -3, 1, 3, new OpaqueBlock());
  set(engine, -3, 2, 3, new RedstoneDust());

  const leverPos = new Position(-4, 2, 3);

  const isClosed = (): boolean => door.every(b => {
    const p = engine.findBlock(b);
    return !!p && p.x === 0;
  });

  const isOpen = (): boolean => door.every(b => {
    const p = engine.findBlock(b);
    return !!p && p.x === 1;
  });

  const toggle = (): void => {
    engine.toggleLever(leverPos);
    engine.tick();
  };

  return { engine, leverPos, doorBlocks: door, toggle, isClosed, isOpen };
}

export function verifySingleLever2x2Translator(): void {
  const build = buildSingleLever2x2Translator();
  if (!build.isClosed()) throw new Error("expected closed at start");
  build.toggle();
  if (!build.isOpen()) throw new Error("expected open after first toggle");
  build.toggle();
  if (!build.isClosed()) throw new Error("expected closed after second toggle");
}
