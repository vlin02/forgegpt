import { BlockType } from "./types.js";
import { addPos, DOWN, NEIGHBOR_OFFSETS, posKey } from "./position.js";
import { Lever } from "./blocks/lever.js";
export class RedstoneSimulator {
    blocks = new Map();
    updateQueue = new Set();
    currentTick = 0;
    setBlock(pos, block) {
        const key = posKey(pos);
        this.blocks.set(key, block);
        this.enqueueUpdate(pos);
        this.enqueueNeighbors(pos);
    }
    removeBlock(pos) {
        const key = posKey(pos);
        this.blocks.delete(key);
        this.enqueueNeighbors(pos);
    }
    getBlock(pos) {
        return this.blocks.get(posKey(pos));
    }
    toggleLever(pos) {
        const block = this.getBlock(pos);
        if (block?.type === BlockType.LEVER) {
            block.toggle();
            this.enqueueUpdate(pos);
            this.enqueueNeighbors(pos);
        }
    }
    tick() {
        const toEvaluate = Array.from(this.updateQueue);
        this.updateQueue.clear();
        for (const key of toEvaluate) {
            const parts = key.split(",").map(Number);
            const pos = { x: parts[0], y: parts[1], z: parts[2] };
            const block = this.blocks.get(key);
            if (!block)
                continue;
            if (block.type === BlockType.DUST) {
                const supportPos = addPos(pos, DOWN);
                if (!this.blocks.get(posKey(supportPos))) {
                    this.removeBlock(pos);
                    continue;
                }
            }
            const getNeighbor = (offset) => {
                const neighborPos = addPos(pos, offset);
                return this.getBlock(neighborPos);
            };
            const getIncomingPower = (offset) => {
                const neighbor = getNeighbor(offset);
                if (!neighbor)
                    return 0;
                if (block.type === BlockType.SOLID &&
                    neighbor.type === BlockType.LEVER) {
                    const lever = neighbor;
                    if (lever.attachmentOffset.x === -offset.x &&
                        lever.attachmentOffset.y === -offset.y &&
                        lever.attachmentOffset.z === -offset.z) {
                        return lever.on ? 15 : 0;
                    }
                }
                return neighbor.getOutgoingPower();
            };
            const changed = block.evaluate(getIncomingPower, getNeighbor);
            if (changed) {
                this.enqueueNeighbors(pos);
            }
        }
        this.currentTick++;
    }
    enqueueUpdate(pos) {
        this.updateQueue.add(posKey(pos));
    }
    enqueueNeighbors(pos) {
        for (const offset of NEIGHBOR_OFFSETS) {
            const neighbor = addPos(pos, offset);
            this.enqueueUpdate(neighbor);
        }
    }
    getTick() {
        return this.currentTick;
    }
    snapshot() {
        const entries = [];
        for (const [key, block] of this.blocks) {
            entries.push(`${key} ${block.toString()}`);
        }
        return entries.sort();
    }
    render() {
        if (this.blocks.size === 0)
            return "";
        const positions = [];
        for (const key of this.blocks.keys()) {
            const parts = key.split(",").map(Number);
            positions.push({ x: parts[0], y: parts[1], z: parts[2] });
        }
        const minX = Math.min(...positions.map((p) => p.x));
        const maxX = Math.max(...positions.map((p) => p.x));
        const minY = Math.min(...positions.map((p) => p.y));
        const maxY = Math.max(...positions.map((p) => p.y));
        const minZ = Math.min(...positions.map((p) => p.z));
        const maxZ = Math.max(...positions.map((p) => p.z));
        const slices = [];
        for (let z = minZ; z <= maxZ; z++) {
            const lines = [];
            for (let y = maxY; y >= minY; y--) {
                let line = "";
                for (let x = minX; x <= maxX; x++) {
                    const block = this.getBlock({ x, y, z });
                    if (block) {
                        const str = block.toString();
                        line += str.padEnd(4);
                    }
                    else {
                        line += ".   ";
                    }
                }
                lines.push(line);
            }
            slices.push(lines.join("\n"));
        }
        return slices.join("\n\n");
    }
}
//# sourceMappingURL=simulator.js.map