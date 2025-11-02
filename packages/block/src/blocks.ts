import type { Position } from "./position.js";

export type BlockType = "solid" | "lever" | "dust" | "piston";

export class Lever {
  readonly type = "lever" as const;
  on = false;
  attachmentOffset: Position;

  constructor(attachmentOffset: Position) {
    this.attachmentOffset = attachmentOffset;
  }

  toString(): string {
    return this.on ? "L+" : "L-";
  }
}

export class Piston {
  readonly type = "piston" as const;
  extended = false;
  facing: Position;
  faceAdjPowered = false; // Track face-adjacent power for QC update requirement

  constructor(facing: Position) {
    this.facing = facing;
  }

  toString(): string {
    return this.extended ? "P>" : "P|";
  }
}

export class RedstoneDust {
  readonly type = "dust" as const;
  power = 0;
  connectedDirs = new Set<string>(); // posKey of direction offsets

  toString(): string {
    return `~${this.power}`;
  }
}

export class OpaqueBlock {
  readonly type = "solid" as const;
  power = 0;

  toString(): string {
    return this.power > 0 ? `#${this.power}` : "#";
  }
}

export type Block = Lever | Piston | RedstoneDust | OpaqueBlock;
