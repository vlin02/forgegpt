import type { Block, Position, PowerLevel } from "../types.js";
export declare class Lever implements Block {
    type: "lever";
    on: boolean;
    attachmentOffset: Position;
    constructor(attachmentOffset: Position);
    toggle(): void;
    getOutgoingPower(): PowerLevel;
    evaluate(_getIncomingPower: (offset: Position) => PowerLevel, _getNeighbor: (offset: Position) => Block | undefined): boolean;
    toString(): string;
}
//# sourceMappingURL=lever.d.ts.map