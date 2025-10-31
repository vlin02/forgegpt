import type { Block, Position, PowerLevel } from "../types.js";
export declare class RedstoneDust implements Block {
    type: "dust";
    power: number;
    getOutgoingPower(): PowerLevel;
    evaluate(getIncomingPower: (offset: Position) => PowerLevel, getNeighbor: (offset: Position) => Block | undefined): boolean;
    toString(): string;
}
//# sourceMappingURL=dust.d.ts.map