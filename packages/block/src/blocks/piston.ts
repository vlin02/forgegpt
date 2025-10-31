import type { Block, Position, PowerLevel } from "../types.js";
import { BlockType } from "../types.js";
import { NEIGHBOR_OFFSETS } from "../position.js";

export class Piston implements Block {
  type = BlockType.PISTON;
  extended = false;

  getOutgoingPower(): PowerLevel {
    return 0;
  }

  evaluate(
    getIncomingPower: (offset: Position) => PowerLevel,
    _getNeighbor: (offset: Position) => Block | undefined,
  ): boolean {
    let powered = false;
    for (const offset of NEIGHBOR_OFFSETS) {
      if (getIncomingPower(offset) > 0) {
        powered = true;
        break;
      }
    }

    const changed = this.extended !== powered;
    this.extended = powered;
    return changed;
  }

  toString(): string {
    return this.extended ? "P>" : "P|";
  }
}
