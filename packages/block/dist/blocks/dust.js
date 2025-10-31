import { BlockType } from "../types.js";
import { HORIZONTAL_OFFSETS } from "../position.js";
export class RedstoneDust {
    type = BlockType.DUST;
    power = 0;
    getOutgoingPower() {
        return this.power;
    }
    evaluate(getIncomingPower, getNeighbor) {
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
    toString() {
        return `~${this.power}`;
    }
}
//# sourceMappingURL=dust.js.map