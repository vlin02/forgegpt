import type { Block, Position, PowerLevel } from "../types.js";
export declare class GenericSolidBlock implements Block {
    type: "solid";
    private strongPower;
    private weakPower;
    getOutgoingPower(): PowerLevel;
    evaluate(getIncomingPower: (offset: Position) => PowerLevel, getNeighbor: (offset: Position) => Block | undefined): boolean;
    toString(): string;
}
//# sourceMappingURL=solid.d.ts.map