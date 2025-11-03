import { Position, DOWN, UP, NEIGHBOR_OFFSETS, HORIZONTAL_OFFSETS } from "./position.js";
import type { Block } from "./blocks.js";
import { Lever, Piston, RedstoneDust, OpaqueBlock } from "./blocks.js";
import LZString from "lz-string";

type PendingMove = {
  from: Position;
  to: Position;
};

export class Engine {
  private blocks = new Map<string, Block>();
  private positions = new WeakMap<Block, Position>();
  private currentTick = 0;
  private pendingMoves: PendingMove[] = [];
  private pendingClears: Position[] = [];

  setBlock(pos: Position, block: Block): boolean {
    const existing = this.getBlock(pos);
    if (existing) return false;
    
    // Validate placement rules per spec
    if (block.type === "lever") {
      const attachPos = pos.add(block.attachmentOffset);
      const attachBlock = this.getBlock(attachPos);
      if (!attachBlock || attachBlock.type !== "solid") return false;
    } else if (block.type === "dust") {
      const supportPos = pos.add(DOWN);
      const supportBlock = this.getBlock(supportPos);
      if (!supportBlock || supportBlock.type !== "solid") return false;
    }
    
    this.blocks.set(pos.toKey(), block);
    this.positions.set(block, pos);
    return true;
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

  getAllBlocks(): Map<string, Block> {
    return this.blocks;
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
          const attachment = this.getBlock(pos.add(block.attachmentOffset));
          if (!attachment || attachment.type !== "solid") {
            this.removeBlock(pos);
          }
          continue;
        }

        if (block.type === "dust") {
          const support = this.getBlock(pos.add(DOWN));
          if (!support || support.type !== "solid") {
            this.removeBlock(pos);
            continue;
          }
          const changed = this.evaluateDust(block, pos);
          if (changed) {
            for (const offset of NEIGHBOR_OFFSETS) {
              const neighborKey = pos.add(offset).toKey();
              if (this.blocks.has(neighborKey)) toProcess.add(neighborKey);
            }
          }
        } else if (block.type === "solid") {
          const changed = this.evaluateSolidBlock(block, pos);
          if (changed) {
            for (const offset of NEIGHBOR_OFFSETS) {
              const neighborKey = pos.add(offset).toKey();
              if (this.blocks.has(neighborKey)) toProcess.add(neighborKey);
            }
          }
        }
      }
    }

    for (const key of pistonUpdates) {
      const pos = Position.fromKey(key);
      const block = this.blocks.get(key);
      if (block?.type === "piston") {
        this.evaluatePiston(block, pos);
      }
    }

    this.applyPendingMoves();
    this.currentTick++;
  }
  
  private applyPendingMoves(): void {
    for (const pos of this.pendingClears) {
      this.removeBlock(pos);
    }
    this.pendingClears = [];

    if (this.pendingMoves.length === 0) return;
    
    const blocksToMove = this.pendingMoves.map(m => ({
      ...m,
      block: this.blocks.get(m.from.toKey())!
    }));
    
    for (const m of blocksToMove) {
      const target = this.getBlock(m.to);
      if (target && (target.type === "dust" || target.type === "lever")) {
        this.blocks.delete(m.to.toKey());
      }
    }
    
    for (const m of blocksToMove) {
      this.blocks.delete(m.from.toKey());
    }
    
    for (const m of blocksToMove) {
      this.blocks.set(m.to.toKey(), m.block);
    }
    
    const blocksToCheck = Array.from(this.blocks.entries());
    for (const [key, block] of blocksToCheck) {
      const pos = Position.fromKey(key);
      
      if (block.type === "dust") {
        const support = this.getBlock(pos.add(DOWN));
        if (!support || support.type !== "solid") {
          this.removeBlock(pos);
        }
      } else if (block.type === "lever") {
        const attachment = this.getBlock(pos.add(block.attachmentOffset));
        if (!attachment || attachment.type !== "solid") {
          this.removeBlock(pos);
        }
      }
    }
    
    this.pendingMoves = [];
  }

  private evaluatePiston(piston: Piston, pos: Position): boolean {
    let faceAdjPowered = false;
    
    for (const offset of NEIGHBOR_OFFSETS) {
      if (offset.y === 1 && piston.facing.y === 1 && !piston.extended) continue;
      
      const neighbor = this.getBlock(pos.add(offset));
      if (!neighbor) continue;
      
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
    
    const above = this.getBlock(pos.add(UP));
    const qcPowered = above ? this.getBlockPower(above) > 0 : false;
    
    const faceAdjChanged = faceAdjPowered !== piston.faceAdjPowered;
    piston.faceAdjPowered = faceAdjPowered;
    
    if (!faceAdjChanged) return false;
    
    const powered = faceAdjPowered || qcPowered;
    const changed = piston.extended !== powered;
    
    if (changed && powered) {
      const plan = this.attemptPush(piston, pos);
      if (plan) {
        this.pendingMoves.push(...plan.moves);
        this.pendingClears.push(...plan.clears);
        piston.extended = true;
      } else {
        return false;
      }
    } else {
      piston.extended = powered;
    }
    
    return changed;
  }
  
  private attemptPush(piston: Piston, pistonPos: Position): { moves: PendingMove[]; clears: Position[] } | null {
    const moves: PendingMove[] = [];
    const clears: Position[] = [];
    let currentPos = pistonPos.add(piston.facing);
    let solidCount = 0;

    while (true) {
      const block = this.getBlock(currentPos);
      if (!block) break;
      if (block.type === "piston") return null;

      if (block.type === "dust" || block.type === "lever") {
        clears.push(currentPos);
        currentPos = currentPos.add(piston.facing);
        continue;
      }

      if (block.type === "solid") {
        solidCount++;
        if (solidCount > 12) return null;
        moves.push({ from: currentPos, to: currentPos.add(piston.facing) });
        currentPos = currentPos.add(piston.facing);
        continue;
      }

      break;
    }

    const sink = this.getBlock(currentPos);
    if (sink && (sink.type === "solid" || sink.type === "piston")) {
      return null;
    }

    return { moves, clears };
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

    const support = this.getBlock(pos.add(DOWN));
    if (support?.type === "solid" && this.isStronglyPowered(pos.add(DOWN))) {
      maxPower = Math.max(maxPower, support.power);
    }

    for (const offset of HORIZONTAL_OFFSETS) {
      const neighborPos = pos.add(offset);
      const neighbor = this.getBlock(neighborPos);
      if (!neighbor) continue;

      if (neighbor.type === "dust") {
        maxPower = Math.max(maxPower, neighbor.power - 1);
        connectedDirs.add(offset.toKey());
      } else if (neighbor.type === "lever" && neighbor.on) {
        maxPower = 15;
      } else if (neighbor.type === "solid" && this.isStronglyPowered(neighborPos)) {
        maxPower = Math.max(maxPower, neighbor.power);
      }
    }

    for (const vertOffset of [UP, DOWN]) {
      for (const horizOffset of HORIZONTAL_OFFSETS) {
        const diagPos = pos.add(vertOffset, horizOffset);
        const diagDust = this.getBlock(diagPos);
        
        if (diagDust?.type === "dust") {
          const mySupport = this.getBlock(pos.add(DOWN));
          const theirSupport = this.getBlock(diagPos.add(DOWN));
          
          if (mySupport?.type === "solid" && theirSupport?.type === "solid") {
            const isUp = vertOffset.y === 1;
            const lower = isUp ? pos : diagPos;
            const upper = isUp ? diagPos : pos;
            const lowerToUpper = isUp ? horizOffset : new Position(-horizOffset.x, 0, -horizOffset.z);
            
            const cellH = lower.add(lowerToUpper);
            const cellV = lower.add(UP);
            const blockH = this.getBlock(cellH);
            const blockV = this.getBlock(cellV);
            
            const lowerSupport = lower.add(DOWN);
            const upperSupport = upper.add(DOWN);
            const cutH = blockH?.type === "solid" && !cellH.equals(lowerSupport) && !cellH.equals(upperSupport);
            const cutV = blockV?.type === "solid" && !cellV.equals(lowerSupport) && !cellV.equals(upperSupport);
            
            if (!cutH && !cutV) {
              maxPower = Math.max(maxPower, diagDust.power - 1);
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
    if (this.isStronglyPowered(pos)) {
      const changed = block.power !== 15;
      block.power = 15;
      return changed;
    }

    let maxWeakPower = 0;
    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = this.getBlock(pos.add(offset));
      if (neighbor?.type === "dust") {
        const isDot = neighbor.connectedDirs.size === 0;
        const isSupport = offset.y === 1;
        if (!isDot || isSupport) {
          maxWeakPower = Math.max(maxWeakPower, neighbor.power);
        }
      }
    }

    const changed = block.power !== maxWeakPower;
    block.power = maxWeakPower;
    return changed;
  }

  private getBlockPower(block: Block): number {
    if (block.type === "lever") return block.on ? 15 : 0;
    if (block.type === "dust") return block.power;
    if (block.type === "solid") return block.power;
    return 0;
  }

  getTick(): number {
    return this.currentTick;
  }

  // --- Serialization ---
  // Snapshot of engine state sufficient to reconstruct the world deterministically
  toJSON(): EngineSnapshot {
    const blocks: any[] = [];
    for (const [key, block] of this.blocks.entries()) {
      const pos = Position.fromKey(key);
      if (block.type === "solid") {
        blocks.push({ type: "solid", pos, power: block.power } satisfies SerializedSolid);
      } else if (block.type === "lever") {
        blocks.push({
          type: "lever",
          pos,
          on: block.on,
          attachmentOffset: { x: block.attachmentOffset.x, y: block.attachmentOffset.y, z: block.attachmentOffset.z },
        } satisfies SerializedLever);
      } else if (block.type === "dust") {
        blocks.push({
          type: "dust",
          pos,
          power: block.power,
          connectedDirs: Array.from(block.connectedDirs),
        } satisfies SerializedDust);
      } else if (block.type === "piston") {
        blocks.push({
          type: "piston",
          pos,
          extended: block.extended,
          faceAdjPowered: block.faceAdjPowered,
          facing: { x: block.facing.x, y: block.facing.y, z: block.facing.z },
        } satisfies SerializedPiston);
      }
    }
    return { tick: this.currentTick, blocks } as EngineSnapshot;
  }

  static fromJSON(data: EngineSnapshot): Engine {
    const sim = new Engine();
    sim.loadJSON(data);
    return sim;
  }

  loadJSON(data: EngineSnapshot): void {
    this.blocks.clear();
    this.positions = new WeakMap();
    this.pendingMoves = [];
    this.pendingClears = [];
    this.currentTick = data.tick | 0;

    for (const b of data.blocks || []) {
      const pos = new Position(b.pos.x, b.pos.y, b.pos.z);
      switch (b.type) {
        case "solid": {
          const block = new OpaqueBlock();
          block.power = b.power ?? 0;
          this.setBlock(pos, block);
          break;
        }
        case "lever": {
          const attach = new Position(b.attachmentOffset.x, b.attachmentOffset.y, b.attachmentOffset.z);
          const block = new Lever(attach);
          block.on = !!b.on;
          this.setBlock(pos, block);
          break;
        }
        case "dust": {
          const block = new RedstoneDust();
          block.power = b.power ?? 0;
          block.connectedDirs = new Set<string>(b.connectedDirs || []);
          this.setBlock(pos, block);
          break;
        }
        case "piston": {
          const facing = new Position(b.facing.x, b.facing.y, b.facing.z);
          const block = new Piston(facing);
          block.extended = !!b.extended;
          block.faceAdjPowered = !!b.faceAdjPowered;
          this.setBlock(pos, block);
          break;
        }
      }
    }
  }

  toURL(): string {
    const json = JSON.stringify(this.toJSON());
    return LZString.compressToEncodedURIComponent(json);
  }

  static fromURL(encoded: string): Engine {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) throw new Error("Invalid URL");
    const snapshot = JSON.parse(json);
    return Engine.fromJSON(snapshot);
  }

  inspectBlock(block: Block): string {
    const pos = this.findBlock(block);
    const posStr = pos ? `${pos.x}, ${pos.y}, ${pos.z}` : "unknown";

    const dirToString = (dir: Position): string => {
      if (dir.x === 1) return "east";
      if (dir.x === -1) return "west";
      if (dir.y === 1) return "up";
      if (dir.y === -1) return "down";
      if (dir.z === 1) return "south";
      if (dir.z === -1) return "north";
      return "unknown";
    };

    switch (block.type) {
      case "solid":
        return `Solid Block\nPosition: ${posStr}\nPower: ${block.power}/15`;
      case "lever":
        const attachDir = dirToString(block.attachmentOffset);
        return `Lever\nPosition: ${posStr}\nState: ${block.on ? "ON" : "off"}\nAttached to: ${attachDir}`;
      case "dust": {
        const dirs = Array.from(block.connectedDirs)
          .map((d) => {
            const [x, , z] = d.split(",").map(Number);
            if (x === 1) return "east";
            if (x === -1) return "west";
            if (z === 1) return "south";
            if (z === -1) return "north";
            return "?";
          })
          .join(", ");
        return `Redstone Dust\nPosition: ${posStr}\nPower: ${block.power}/15\nShape: ${dirs || "dot"}`;
      }
      case "piston":
        const faceDir = dirToString(block.facing);
        return `Piston\nPosition: ${posStr}\nState: ${block.extended ? "EXTENDED" : "retracted"}\nFacing: ${faceDir}`;
    }
  }
}

// --- Types for serialization ---
export type SerializedPosition = { x: number; y: number; z: number };

export type SerializedSolid = {
  type: "solid";
  pos: SerializedPosition;
  power: number;
};

export type SerializedLever = {
  type: "lever";
  pos: SerializedPosition;
  on: boolean;
  attachmentOffset: SerializedPosition;
};

export type SerializedDust = {
  type: "dust";
  pos: SerializedPosition;
  power: number;
  connectedDirs: string[];
};

export type SerializedPiston = {
  type: "piston";
  pos: SerializedPosition;
  extended: boolean;
  faceAdjPowered: boolean;
  facing: SerializedPosition;
};

export type SerializedBlock = SerializedSolid | SerializedLever | SerializedDust | SerializedPiston;

export type EngineSnapshot = {
  tick: number;
  blocks: SerializedBlock[];
};
