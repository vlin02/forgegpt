import type { Position } from "./types.js";
import { BlockType } from "./types.js";

export class Lever {
  type = BlockType.LEVER;
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
  type = BlockType.PISTON;
  extended = false;

  toString(): string {
    return this.extended ? "P>" : "P|";
  }
}

export class RedstoneDust {
  type = BlockType.DUST;
  power = 0;

  toString(): string {
    return `~${this.power}`;
  }
}

export class GenericSolidBlock {
  type = BlockType.SOLID;
  power = 0;

  toString(): string {
    return this.power > 0 ? `#${this.power}` : "#";
  }
}

export type Block = Lever | Piston | RedstoneDust | GenericSolidBlock;
