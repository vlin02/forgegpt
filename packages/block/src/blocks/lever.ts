import type { Block, Position, PowerLevel } from "../types.js";
import { BlockType } from "../types.js";

export class Lever implements Block {
  type = BlockType.LEVER;
  on = false;
  attachmentOffset: Position;

  constructor(attachmentOffset: Position) {
    this.attachmentOffset = attachmentOffset;
  }

  toggle(): void {
    this.on = !this.on;
  }

  getOutgoingPower(): PowerLevel {
    return this.on ? 15 : 0;
  }

  evaluate(
    _getIncomingPower: (offset: Position) => PowerLevel,
    _getNeighbor: (offset: Position) => Block | undefined,
  ): boolean {
    return false;
  }

  toString(): string {
    return this.on ? "L+" : "L-";
  }
}
