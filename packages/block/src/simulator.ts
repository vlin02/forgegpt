import type { Block, Position } from "./types.js";
import { BlockType } from "./types.js";
import { addPos, DOWN, NEIGHBOR_OFFSETS, posKey } from "./position.js";
import { Lever } from "./blocks/lever.js";

export class RedstoneSimulator {
  private blocks = new Map<string, Block>();
  private updateQueue = new Set<string>();
  private currentTick = 0;

  setBlock(pos: Position, block: Block): void {
    const key = posKey(pos);
    this.blocks.set(key, block);
    this.enqueueUpdate(pos);
    this.enqueueNeighbors(pos);
  }

  removeBlock(pos: Position): void {
    const key = posKey(pos);
    this.blocks.delete(key);
    this.enqueueNeighbors(pos);
  }

  getBlock(pos: Position): Block | undefined {
    return this.blocks.get(posKey(pos));
  }

  toggleLever(pos: Position): void {
    const block = this.getBlock(pos);
    if (block?.type === BlockType.LEVER) {
      (block as Lever).toggle();
      this.enqueueUpdate(pos);
      this.enqueueNeighbors(pos);
    }
  }

  tick(): void {
    const toEvaluate = Array.from(this.updateQueue);
    this.updateQueue.clear();

    for (const key of toEvaluate) {
      const parts = key.split(",").map(Number);
      const pos = { x: parts[0]!, y: parts[1]!, z: parts[2]! };
      const block = this.blocks.get(key);

      if (!block) continue;

      if (block.type === BlockType.DUST) {
        const supportPos = addPos(pos, DOWN);
        if (!this.blocks.get(posKey(supportPos))) {
          this.removeBlock(pos);
          continue;
        }
      }

      const getNeighbor = (offset: Position): Block | undefined => {
        const neighborPos = addPos(pos, offset);
        return this.getBlock(neighborPos);
      };

      const getIncomingPower = (offset: Position): number => {
        const neighbor = getNeighbor(offset);
        if (!neighbor) return 0;

        if (
          block.type === BlockType.SOLID &&
          neighbor.type === BlockType.LEVER
        ) {
          const lever = neighbor as Lever;
          if (
            lever.attachmentOffset.x === -offset.x &&
            lever.attachmentOffset.y === -offset.y &&
            lever.attachmentOffset.z === -offset.z
          ) {
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

  private enqueueUpdate(pos: Position): void {
    this.updateQueue.add(posKey(pos));
  }

  private enqueueNeighbors(pos: Position): void {
    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = addPos(pos, offset);
      this.enqueueUpdate(neighbor);
    }
  }

  getTick(): number {
    return this.currentTick;
  }

  snapshot(): string[] {
    const entries: string[] = [];
    for (const [key, block] of this.blocks) {
      entries.push(`${key} ${block.toString()}`);
    }
    return entries.sort();
  }

  render(): string {
    if (this.blocks.size === 0) return "";

    const positions: Position[] = [];
    for (const key of this.blocks.keys()) {
      const parts = key.split(",").map(Number);
      positions.push({ x: parts[0]!, y: parts[1]!, z: parts[2]! });
    }

    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));
    const minZ = Math.min(...positions.map((p) => p.z));
    const maxZ = Math.max(...positions.map((p) => p.z));

    const slices: string[] = [];

    for (let z = minZ; z <= maxZ; z++) {
      const lines: string[] = [];
      for (let y = maxY; y >= minY; y--) {
        let line = "";
        for (let x = minX; x <= maxX; x++) {
          const block = this.getBlock({ x, y, z });
          if (block) {
            const str = block.toString();
            line += str.padEnd(4);
          } else {
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
