import { Position } from "./position.js";
import type { Block } from "./blocks.js";
import { OpaqueBlock, Lever, RedstoneDust, Piston } from "./blocks.js";
import { Engine } from "./engine.js";

export { NORTH, SOUTH, EAST, WEST, UP, DOWN, Position } from "./position.js";

export type Instruction =
  | { type: "solid" }
  | { type: "dust" }
  | { type: "lever"; attachmentOffset: { x: number; y: number; z: number } }
  | { type: "piston"; facing: { x: number; y: number; z: number } }
  | { type: "move"; offset: { x: number; y: number; z: number } };

export class Builder {
  private cursor: Position = new Position(0, 0, 0);
  private engine: Engine;
  private namedBlocks = new Map<string, Block>();
  private lastPlaced: Block | null = null;
  private history: Instruction[] = [];

  constructor(engine: Engine) {
    this.engine = engine;
  }

  getCursor(): Position {
    return new Position(this.cursor.x, this.cursor.y, this.cursor.z);
  }

  getNamedBlocks(): Map<string, Block> {
    return new Map(this.namedBlocks);
  }

  save(name: string): this {
    if (this.lastPlaced) {
      this.namedBlocks.set(name, this.lastPlaced);
    }
    return this;
  }

  solid(): this {
    this.history.push({ type: "solid" });
    const block = new OpaqueBlock();
    this.engine.setBlock(this.cursor, block);
    this.lastPlaced = block;
    return this;
  }

  lever(attachmentOffset: Position): this {
    const instr = {
      type: "lever" as const,
      attachmentOffset: {
        x: attachmentOffset.x,
        y: attachmentOffset.y,
        z: attachmentOffset.z,
      },
    };
    this.history.push(instr);
    const block = new Lever(attachmentOffset);
    this.engine.setBlock(this.cursor, block);
    this.lastPlaced = block;
    return this;
  }

  dust(): this {
    this.history.push({ type: "dust" });
    const block = new RedstoneDust();
    this.engine.setBlock(this.cursor, block);
    this.lastPlaced = block;
    return this;
  }

  piston(facing: Position): this {
    const instr = {
      type: "piston" as const,
      facing: { x: facing.x, y: facing.y, z: facing.z },
    };
    this.history.push(instr);
    const block = new Piston(facing);
    this.engine.setBlock(this.cursor, block);
    this.lastPlaced = block;
    return this;
  }

  ref(id: string): Block {
    const block = this.namedBlocks.get(id);
    if (!block) throw new Error(`Unknown block ID: ${id}`);
    return block;
  }

  move(offset: Position): this {
    this.history.push({
      type: "move",
      offset: { x: offset.x, y: offset.y, z: offset.z },
    });
    this.cursor = this.cursor.add(offset);
    return this;
  }

  at(x: number, y: number, z: number): this {
    this.cursor = new Position(x, y, z);
    return this;
  }

  getBlock(pos: Position): Block | undefined {
    return this.engine.getBlock(pos);
  }

  inspectCursor(): string | null {
    const block = this.engine.getBlock(this.cursor);
    if (!block) return null;
    return this.inspectBlock(block);
  }

  private dirToString(dir: Position): string {
    if (dir.x === 1) return "east";
    if (dir.x === -1) return "west";
    if (dir.y === 1) return "up";
    if (dir.y === -1) return "down";
    if (dir.z === 1) return "south";
    if (dir.z === -1) return "north";
    return "unknown";
  }

  inspectBlock(block: Block): string {
    const pos = this.engine.findBlock(block);
    const posStr = pos ? `${pos.x}, ${pos.y}, ${pos.z}` : "unknown";
 
    switch (block.type) {
      case "solid":
        return `Solid Block\nPosition: ${posStr}\nPower: ${block.power}/15`;
      case "lever":
        const attachDir = this.dirToString(block.attachmentOffset);
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
        const faceDir = this.dirToString(block.facing);
        return `Piston\nPosition: ${posStr}\nState: ${block.extended ? "EXTENDED" : "retracted"}\nFacing: ${faceDir}`;
    }
  }

  run(ticks: number = 1): this {
    for (let i = 0; i < ticks; i++) {
      this.engine.tick();
    }
    return this;
  }

  toggle(block: Block): this {
    this.engine.toggleLever(block);
    return this;
  }

  remove(block: Block): this {
    this.engine.removeBlock(block);
    return this;
  }

  getHistory(): Instruction[] {
    return [...this.history];
  }
}
