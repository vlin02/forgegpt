import { BlockType } from "../types.js";
import { NEIGHBOR_OFFSETS } from "../position.js";
export class Piston {
    type = BlockType.PISTON;
    extended = false;
    getOutgoingPower() {
        return 0;
    }
    evaluate(getIncomingPower, _getNeighbor) {
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
    toString() {
        return this.extended ? "P>" : "P|";
    }
}
//# sourceMappingURL=piston.js.map