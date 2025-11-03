import { Position } from "./position.js";
import type { Block } from "./blocks.js";
import { OpaqueBlock, Lever, RedstoneDust, Piston } from "./blocks.js";
import { Engine } from "./engine.js";

export { NORTH, SOUTH, EAST, WEST, UP, DOWN, Position } from "./position.js";

export class Builder {
  private cursor: Position = new Position(0, 0, 0);
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  getCursor(): Position {
    return this.cursor.copy()
  }

  solid(): OpaqueBlock {
    const block = new OpaqueBlock();
    this.engine.setBlock(this.cursor, block);
    return block;
  }

  lever(attachmentOffset: Position): Lever {
    const block = new Lever(attachmentOffset);
    this.engine.setBlock(this.cursor, block);
    return block;
  }

  dust(): RedstoneDust {
    const block = new RedstoneDust();
    this.engine.setBlock(this.cursor, block);
    return block;
  }

  piston(facing: Position): Piston {
    const block = new Piston(facing);
    this.engine.setBlock(this.cursor, block);
    return block;
  }

  move(...args: (Position | number)[]): this {
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (arg instanceof Position) {
        const count =
          i + 1 < args.length && typeof args[i + 1] === "number"
            ? (args[i + 1] as number)
            : 1;
        for (let j = 0; j < count; j++) {
          this.cursor = this.cursor.add(arg);
        }
        i += count === 1 ? 1 : 2;
      } else {
        throw new Error(
          "move() expects Position or Position followed by number",
        );
      }
    }
    return this;
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
}
