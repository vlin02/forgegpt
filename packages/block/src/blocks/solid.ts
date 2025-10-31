import type { Block, Position, PowerLevel } from "../types.js";
import { BlockType } from "../types.js";
import { NEIGHBOR_OFFSETS } from "../position.js";

export class GenericSolidBlock implements Block {
  type = BlockType.SOLID;
  private strongPower = 0;
  private weakPower = 0;

  getOutgoingPower(): PowerLevel {
    return this.strongPower;
  }

  evaluate(
    getIncomingPower: (offset: Position) => PowerLevel,
    getNeighbor: (offset: Position) => Block | undefined,
  ): boolean {
    let maxStrong = 0;
    let maxWeak = 0;

    for (const offset of NEIGHBOR_OFFSETS) {
      const power = getIncomingPower(offset);
      const neighbor = getNeighbor(offset);

      if (neighbor && neighbor.type === BlockType.LEVER && power === 15) {
        maxStrong = 15;
      } else if (power > 0) {
        maxWeak = Math.max(maxWeak, power);
      }
    }

    const changed =
      this.strongPower !== maxStrong || this.weakPower !== maxWeak;
    this.strongPower = maxStrong;
    this.weakPower = maxWeak;
    return changed;
  }

  toString(): string {
    const power = this.getOutgoingPower();
    return power > 0 ? `#${power}` : "#";
  }
}
