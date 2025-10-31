import type { Block, Position } from "./types.js";
export declare class RedstoneSimulator {
    private blocks;
    private updateQueue;
    private currentTick;
    setBlock(pos: Position, block: Block): void;
    removeBlock(pos: Position): void;
    getBlock(pos: Position): Block | undefined;
    toggleLever(pos: Position): void;
    tick(): void;
    private enqueueUpdate;
    private enqueueNeighbors;
    getTick(): number;
    snapshot(): string[];
    render(): string;
}
//# sourceMappingURL=simulator.d.ts.map