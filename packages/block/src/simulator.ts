import type { Position } from "./types.js";
import { BlockType } from "./types.js";
import { addPos, DOWN, NEIGHBOR_OFFSETS, HORIZONTAL_OFFSETS, parsePos, posKey } from "./position.js";
import type { Block } from "./blocks.js";
import { Lever, Piston, RedstoneDust, GenericSolidBlock } from "./blocks.js";

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
      block.on = !block.on;
      this.enqueueUpdate(pos);
      this.enqueueNeighbors(pos);
    }
  }

  tick(): void {
    const toProcess = new Set(this.updateQueue);
    this.updateQueue.clear();

    const pistonUpdates = new Set<string>();

    // Intra-tick closure: evaluate stateless components until fixpoint
    while (toProcess.size > 0) {
      const current = Array.from(toProcess);
      toProcess.clear();

      for (const key of current) {
        const block = this.blocks.get(key);
        if (!block) continue;

        if (block.type === BlockType.PISTON) {
          pistonUpdates.add(key);
          continue;
        }

        if (block.type === BlockType.LEVER) continue;

        const pos = parsePos(key);

        if (block.type === BlockType.DUST) {
          if (!this.getBlock(addPos(pos, DOWN))) {
            this.removeBlock(pos);
            continue;
          }
        }

        const changed =
          block.type === BlockType.DUST
            ? this.evaluateDust(block, pos)
            : this.evaluateSolidBlock(block, pos);

        if (changed) {
          for (const offset of NEIGHBOR_OFFSETS) {
            const neighborKey = posKey(addPos(pos, offset));
            if (this.blocks.has(neighborKey)) toProcess.add(neighborKey);
          }
        }
      }
    }

    // Evaluate pistons after closure
    for (const key of pistonUpdates) {
      const pos = parsePos(key);
      const block = this.blocks.get(key);
      if (!block || block.type !== BlockType.PISTON) continue;

      const changed = this.evaluatePiston(block, pos);

      if (changed) this.enqueueNeighbors(pos);
    }

    this.currentTick++;
  }

  private evaluatePiston(piston: Piston, pos: Position): boolean {
    let powered = false;
    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = this.getBlock(addPos(pos, offset));
      if (neighbor && this.getBlockPower(neighbor) > 0) {
        powered = true;
        break;
      }
    }

    const changed = piston.extended !== powered;
    piston.extended = powered;
    return changed;
  }

  private evaluateDust(dust: RedstoneDust, pos: Position): boolean {
    let maxPower = 0;

    for (const offset of HORIZONTAL_OFFSETS) {
      const neighbor = this.getBlock(addPos(pos, offset));
      const power = neighbor ? this.getIncomingPower(pos, offset, dust) : 0;

      if (!neighbor || neighbor.type !== BlockType.DUST) {
        if (power === 15) {
          maxPower = 15;
        }
      } else {
        const decayed = Math.max(0, power - 1);
        maxPower = Math.max(maxPower, decayed);
      }
    }

    const changed = dust.power !== maxPower;
    dust.power = maxPower;
    return changed;
  }

  private evaluateSolidBlock(block: GenericSolidBlock, pos: Position): boolean {
    let hasStrongPower = false;

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = this.getBlock(addPos(pos, offset));
      if (!neighbor) continue;

      const power = this.getIncomingPower(pos, offset, block);
      if (neighbor.type === BlockType.LEVER && power === 15) {
        hasStrongPower = true;
        break;
      }
    }

    const newPower = hasStrongPower ? 15 : 0;
    const changed = block.power !== newPower;
    block.power = newPower;
    return changed;
  }

  private getBlockPower(block: Block): number {
    if (block.type === BlockType.LEVER) return block.on ? 15 : 0;
    if (block.type === BlockType.DUST) return block.power;
    if (block.type === BlockType.SOLID) return block.power;
    return 0;
  }

  private getIncomingPower(
    pos: Position,
    offset: Position,
    block: Block,
  ): number {
    const neighbor = this.getBlock(addPos(pos, offset));
    if (!neighbor) return 0;

    if (block.type === BlockType.SOLID && neighbor.type === BlockType.LEVER) {
      if (
        neighbor.attachmentOffset.x === -offset.x &&
        neighbor.attachmentOffset.y === -offset.y &&
        neighbor.attachmentOffset.z === -offset.z
      ) {
        return neighbor.on ? 15 : 0;
      }
    }

    return this.getBlockPower(neighbor);
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
