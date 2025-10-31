import { BlockType } from "../types.js";
export class Lever {
    type = BlockType.LEVER;
    on = false;
    attachmentOffset;
    constructor(attachmentOffset) {
        this.attachmentOffset = attachmentOffset;
    }
    toggle() {
        this.on = !this.on;
    }
    getOutgoingPower() {
        return this.on ? 15 : 0;
    }
    evaluate(_getIncomingPower, _getNeighbor) {
        return false;
    }
    toString() {
        return this.on ? "L+" : "L-";
    }
}
//# sourceMappingURL=lever.js.map