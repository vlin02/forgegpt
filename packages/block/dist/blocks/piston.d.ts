import type { Block, Position, PowerLevel } from "../types.js";
export declare class Piston implements Block {
    type: "piston";
    extended: boolean;
    getOutgoingPower(): PowerLevel;
    evaluate(getIncomingPower: (offset: Position) => PowerLevel, _getNeighbor: (offset: Position) => Block | undefined): boolean;
    toString(): string;
}
//# sourceMappingURL=piston.d.ts.map