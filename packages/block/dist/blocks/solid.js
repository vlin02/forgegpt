import { BlockType } from "../types.js";
import { NEIGHBOR_OFFSETS } from "../position.js";
export class GenericSolidBlock {
    type = BlockType.SOLID;
    strongPower = 0;
    weakPower = 0;
    getOutgoingPower() {
        return this.strongPower;
    }
    evaluate(getIncomingPower, getNeighbor) {
        let maxStrong = 0;
        let maxWeak = 0;
        for (const offset of NEIGHBOR_OFFSETS) {
            const power = getIncomingPower(offset);
            const neighbor = getNeighbor(offset);
            if (neighbor && neighbor.type === BlockType.LEVER && power === 15) {
                maxStrong = 15;
            }
            else if (power > 0) {
                maxWeak = Math.max(maxWeak, power);
            }
        }
        const changed = this.strongPower !== maxStrong || this.weakPower !== maxWeak;
        this.strongPower = maxStrong;
        this.weakPower = maxWeak;
        return changed;
    }
    toString() {
        const power = this.getOutgoingPower();
        return power > 0 ? `#${power}` : "#";
    }
}
//# sourceMappingURL=solid.js.map