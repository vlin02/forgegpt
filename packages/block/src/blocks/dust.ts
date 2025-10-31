import type { Block, Position, PowerLevel } from "../types.js";
import { BlockType } from "../types.js";
import { HORIZONTAL_OFFSETS } from "../position.js";

export class RedstoneDust implements Block {
  type = BlockType.DUST;
  power = 0;

  getOutgoingPower(): PowerLevel {
    return this.power;
  }

  evaluate(
    getIncomingPower: (offset: Position) => PowerLevel,
    getNeighbor: (offset: Position) => Block | undefined,
  ): boolean {
    let maxInput = 0;

    for (const offset of HORIZONTAL_OFFSETS) {
      const power = getIncomingPower(offset);
      const neighbor = getNeighbor(offset);

      if (neighbor && neighbor.type !== "dust" && power === 15) {
        maxInput = 15;
        break;
      }
      if (power > 0) {
        maxInput = Math.max(maxInput, power - 1);
      }
    }

    const changed = this.power !== maxInput;
    this.power = maxInput;
    return changed;
  }

  toString(): string {
    return `~${this.power}`;
  }
}
