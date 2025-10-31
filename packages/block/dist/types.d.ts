export type Position = {
    x: number;
    y: number;
    z: number;
};
export type PowerLevel = number;
export declare const BlockType: {
    readonly SOLID: "solid";
    readonly LEVER: "lever";
    readonly DUST: "dust";
    readonly PISTON: "piston";
};
export type BlockType = (typeof BlockType)[keyof typeof BlockType];
export interface Block {
    type: BlockType;
    getOutgoingPower(): PowerLevel;
    evaluate(getIncomingPower: (offset: Position) => PowerLevel, getNeighbor: (offset: Position) => Block | undefined): boolean;
    toString(): string;
}
//# sourceMappingURL=types.d.ts.map