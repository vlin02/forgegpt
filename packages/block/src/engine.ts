import { Position, DOWN, UP, NEIGHBOR_OFFSETS, HORIZONTAL_OFFSETS } from "./position.js";
import type { Block } from "./blocks.js";
import { Lever, Piston, RedstoneDust, OpaqueBlock } from "./blocks.js";

type PendingMove = {
  from: Position;
  to: Position;
};

export class Engine {
  private blocks = new Map<string, Block>();
  private positions = new WeakMap<Block, Position>();
  private currentTick = 0;
  private pendingMoves: PendingMove[] = [];

  setBlock(pos: Position, block: Block): void {
    this.blocks.set(pos.toKey(), block);
    this.positions.set(block, pos);
  }

  removeBlock(blockOrPos: Block | Position): void {
    const pos = blockOrPos instanceof Position ? blockOrPos : this.positions.get(blockOrPos);
    if (!pos) return;
    const block = this.blocks.get(pos.toKey());
    this.blocks.delete(pos.toKey());
    if (block) this.positions.delete(block);
  }

  getBlock(pos: Position): Block | undefined {
    return this.blocks.get(pos.toKey());
  }

  findBlock(block: Block): Position | undefined {
    return this.positions.get(block);
  }

  toggleLever(blockOrPos: Block | Position): void {
    const pos = blockOrPos instanceof Position ? blockOrPos : this.positions.get(blockOrPos);
    if (!pos) return;
    const block = this.getBlock(pos);
    if (block?.type === "lever") {
      block.on = !block.on;
    }
  }

  tick(): void {
    const toProcess = new Set(this.blocks.keys());

    const pistonUpdates = new Set<string>();

    // Intra-tick closure: evaluate stateless components until fixpoint
    while (toProcess.size > 0) {
      const current = Array.from(toProcess);
      toProcess.clear();

      for (const key of current) {
        const block = this.blocks.get(key);
        if (!block) continue;

        if (block.type === "piston") {
          pistonUpdates.add(key);
          continue;
        }

        const pos = Position.fromKey(key);

        if (block.type === "lever") {
          const attachmentPos = pos.add(block.attachmentOffset);
          const attachment = this.getBlock(attachmentPos);
          if (!attachment || attachment.type !== "solid") {
            this.removeBlock(pos);
            continue;
          }
          continue;
        }

        if (block.type === "dust") {
          const support = this.getBlock(pos.add(DOWN));
          if (!support || support.type !== "solid") {
            this.removeBlock(pos);
            continue;
          }
        }

        let changed = false;
        if (block.type === "dust") {
          changed = this.evaluateDust(block, pos);
        } else if (block.type === "solid") {
          changed = this.evaluateSolidBlock(block, pos);
        }

        if (changed) {
          for (const offset of NEIGHBOR_OFFSETS) {
            const neighborKey = pos.add(offset).toKey();
            if (this.blocks.has(neighborKey)) toProcess.add(neighborKey);
          }
        }
      }
    }

    // Evaluate pistons after closure
    for (const key of pistonUpdates) {
      const pos = Position.fromKey(key);
      const block = this.blocks.get(key);
      if (block?.type === "piston") {
        this.evaluatePiston(block, pos);
      }
    }

    // D6: Apply all block movements atomically at end of Phase 2
    this.applyPendingMoves();

    this.currentTick++;
  }
  
  private applyPendingMoves(): void {
    if (this.pendingMoves.length === 0) return;
    
    // Lookup blocks before deleting
    const blocksToMove = this.pendingMoves.map(m => ({
      ...m,
      block: this.blocks.get(m.from.toKey())!
    }));
    
    // P1: Destroy dust/lever in target cells (will be overwritten by moving blocks)
    for (const m of blocksToMove) {
      const targetBlock = this.getBlock(m.to);
      if (targetBlock && (targetBlock.type === "dust" || targetBlock.type === "lever")) {
        this.blocks.delete(m.to.toKey());
      }
    }
    
    // Atomic motion - remove all blocks from source positions
    for (const m of blocksToMove) {
      this.blocks.delete(m.from.toKey());
    }
    
    // Place all blocks at target positions
    for (const m of blocksToMove) {
      this.blocks.set(m.to.toKey(), m.block);
    }
    
    // P5: Handle breaking mechanics for dust and levers
    const blocksToCheck = Array.from(this.blocks.entries());
    for (const [key, block] of blocksToCheck) {
      const pos = Position.fromKey(key);
      
      if (block.type === "dust") {
        // Check if support block is still present
        const support = this.getBlock(pos.add(DOWN));
        if (!support || support.type !== "solid") {
          this.removeBlock(pos);
        }
      } else if (block.type === "lever") {
        // Check if attachment block is still present
        const attachmentPos = pos.add(block.attachmentOffset);
        const attachment = this.getBlock(attachmentPos);
        if (!attachment || attachment.type !== "solid") {
          this.removeBlock(pos);
        }
      }
    }
    
    this.pendingMoves = [];
  }

  private evaluatePiston(piston: Piston, pos: Position): boolean {
    let faceAdjPowered = false;
    
    // Check 6 face-adjacent positions
    for (const offset of NEIGHBOR_OFFSETS) {
      // D2: Up-facing piston cannot be powered by block above unless extended
      if (offset.y === 1 && piston.facing.y === 1 && !piston.extended) {
        continue;
      }
      
      const neighbor = this.getBlock(pos.add(offset));
      if (!neighbor) continue;
      
      // B1: Piston counts dust only if dust points into piston
      if (neighbor.type === "dust") {
        const dirToPiston = new Position(-offset.x, 0, -offset.z).toKey();
        if (neighbor.connectedDirs.has(dirToPiston) && neighbor.power > 0) {
          faceAdjPowered = true;
          break;
        }
      } else if (this.getBlockPower(neighbor) > 0) {
        faceAdjPowered = true;
        break;
      }
    }
    
    // Quasi-connectivity - check space directly above
    const above = this.getBlock(pos.add(UP));
    const qcPowered = above ? this.getBlockPower(above) > 0 : false;
    
    // QC power requires block update (face-adjacent change) to activate
    const faceAdjChanged = faceAdjPowered !== piston.faceAdjPowered;
    piston.faceAdjPowered = faceAdjPowered;
    
    // Only react to face-adjacent power changes, but consider total power
    if (!faceAdjChanged) {
      return false;
    }
    
    const powered = faceAdjPowered || qcPowered;
    const changed = piston.extended !== powered;
    
    // If extending, attempt to push blocks
    if (changed && powered) {
      const moves = this.attemptPush(piston, pos);
      if (moves) {
        this.pendingMoves.push(...moves);
        piston.extended = true;
      } else {
        // Push failed, don't extend
        return false;
      }
    } else {
      piston.extended = powered;
    }
    
    return changed;
  }
  
  private attemptPush(piston: Piston, pistonPos: Position): PendingMove[] | null {
    const moves: PendingMove[] = [];
    const facing = piston.facing;
    let currentPos = pistonPos.add(facing);
    
    // P1: Scan contiguous OpaqueBlocks (up to 12)
    for (let i = 0; i < 12; i++) {
      const block = this.getBlock(currentPos);
      
      if (!block) {
        // Empty space, end of push line
        break;
      }
      
      // P3: Immovable obstacle
      if (block.type === "piston") {
        return null;
      }
      
      // P1: Only solid blocks are pushable
      if (block.type === "solid") {
        const targetPos = currentPos.add(facing);
        moves.push({ from: currentPos, to: targetPos });
        currentPos = currentPos.add(facing);
      } else {
        // P1: dust/lever break contiguity, end of push line
        break;
      }
    }
    
    // P2: Check sink (cell beyond push line) is empty of full blocks
    const sinkBlock = this.getBlock(currentPos);
    if (sinkBlock && (sinkBlock.type === "solid" || sinkBlock.type === "piston")) {
      return null;
    }
    
    return moves;
  }

  private isStronglyPowered(pos: Position): boolean {
    for (const offset of NEIGHBOR_OFFSETS) {
      const neighborPos = pos.add(offset);
      const neighbor = this.getBlock(neighborPos);
      if (!neighbor) continue;

      if (neighbor.type === "lever" && neighbor.on) {
        if (
          neighbor.attachmentOffset.x === -offset.x &&
          neighbor.attachmentOffset.y === -offset.y &&
          neighbor.attachmentOffset.z === -offset.z
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private evaluateDust(dust: RedstoneDust, pos: Position): boolean {
    let maxPower = 0;
    const connectedDirs = new Set<string>();

    // Horizontal neighbors
    for (const offset of HORIZONTAL_OFFSETS) {
      const neighborPos = pos.add(offset);
      const neighbor = this.getBlock(neighborPos);
      if (!neighbor) continue;

      if (neighbor.type === "dust") {
        const decayed = Math.max(0, neighbor.power - 1);
        maxPower = Math.max(maxPower, decayed);
        connectedDirs.add(offset.toKey());
      } else if (neighbor.type === "solid") {
        if (this.isStronglyPowered(neighborPos)) {
          maxPower = Math.max(maxPower, neighbor.power);
        }
      } else if (neighbor.type === "piston") {
        // B1: Dust connects to pistons for shape purposes
        connectedDirs.add(offset.toKey());
      } else {
        const power = this.getIncomingPower(pos, offset, dust);
        if (power === 15) {
          maxPower = 15;
        }
      }
    }

    // Vertical neighbors (±1 Y step connectivity)
    for (const vertOffset of [UP, DOWN]) {
      for (const horizOffset of HORIZONTAL_OFFSETS) {
        const diagonalPos = pos.add(vertOffset, horizOffset);
        const diagDust = this.getBlock(diagonalPos);
        
        if (diagDust?.type === "dust") {
          // Check both dust pieces sit on OpaqueBlocks
          const mySupport = this.getBlock(pos.add(DOWN));
          const theirSupport = this.getBlock(diagonalPos.add(DOWN));
          
          if (mySupport?.type === "solid" && theirSupport?.type === "solid") {
            // Always use LOWER dust as reference for between positions
            const lowerPos = vertOffset.y === 1 ? pos : diagonalPos;
            
            // Check if either edge-sharing cell cuts the connection
            const betweenHoriz = lowerPos.add(horizOffset);
            const betweenVert = lowerPos.add(UP);
            const blockH = this.getBlock(betweenHoriz);
            const blockV = this.getBlock(betweenVert);
            
            const cutsDiagonal = (blockH?.type === "solid") || (blockV?.type === "solid");
            
            if (!cutsDiagonal) {
              const decayed = Math.max(0, diagDust.power - 1);
              maxPower = Math.max(maxPower, decayed);
              connectedDirs.add(horizOffset.toKey());
            }
          }
        }
      }
    }

    const powerChanged = dust.power !== maxPower;
    const connectionsChanged = dust.connectedDirs.size !== connectedDirs.size ||
      !Array.from(connectedDirs).every(d => dust.connectedDirs.has(d));
    
    dust.power = maxPower;
    dust.connectedDirs = connectedDirs;
    return powerChanged || connectionsChanged;
  }

  private evaluateSolidBlock(block: OpaqueBlock, pos: Position): boolean {
    let hasStrongPower = false;
    let maxWeakPower = 0;

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = this.getBlock(pos.add(offset));
      if (!neighbor) continue;

      const power = this.getIncomingPower(pos, offset, block);
      if (neighbor.type === "lever" && power === 15) {
        hasStrongPower = true;
        break;
      }
      
      if (neighbor.type === "dust") {
        // B1: Dot only powers support block (below), not sides
        const isDot = neighbor.connectedDirs.size === 0;
        const isSupport = offset.y === 1; // Solid is below dust
        
        if (!isDot || isSupport) {
          maxWeakPower = Math.max(maxWeakPower, neighbor.power);
        }
      }
    }

    const newPower = hasStrongPower ? 15 : maxWeakPower;
    const changed = block.power !== newPower;
    block.power = newPower;
    return changed;
  }

  private getBlockPower(block: Block): number {
    if (block.type === "lever") return block.on ? 15 : 0;
    if (block.type === "dust") return block.power;
    if (block.type === "solid") return block.power;
    return 0;
  }

  private getIncomingPower(
    pos: Position,
    offset: Position,
    block: Block,
  ): number {
    const neighbor = this.getBlock(pos.add(offset));
    if (!neighbor) return 0;

    if (block.type === "solid" && neighbor.type === "lever") {
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
      positions.push(new Position(parts[0]!, parts[1]!, parts[2]!));
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
          const block = this.getBlock(new Position(x, y, z));
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
