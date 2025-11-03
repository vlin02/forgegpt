import type { Position } from "./position.js";

export type BlockType = "solid" | "lever" | "dust" | "piston";

export class Lever {
  readonly type = "lever" as const;
  on = false;
  attachmentOffset: Position;

  constructor(attachmentOffset: Position) {
    this.attachmentOffset = attachmentOffset;
  }
}

export class Piston {
  readonly type = "piston" as const;
  extended = false;
  facing: Position;
  faceAdjPowered = false;

  constructor(facing: Position) {
    this.facing = facing;
  }
}

export class RedstoneDust {
  readonly type = "dust" as const;
  power = 0;
  connectedDirs = new Set<string>();
}

export class OpaqueBlock {
  readonly type = "solid" as const;
  power = 0;
}

export type Block = Lever | Piston | RedstoneDust | OpaqueBlock;
