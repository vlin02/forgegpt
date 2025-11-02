export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {}

  add(...positions: Position[]): Position {
    const result = positions.reduce(
      (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y, z: acc.z + pos.z }),
      { x: this.x, y: this.y, z: this.z }
    );
    return new Position(result.x, result.y, result.z);
  }

  mul(scalar: number): Position {
    return new Position(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  toKey(): string {
    return `${this.x},${this.y},${this.z}`;
  }

  static fromKey(key: string): Position {
    const [x, y, z] = key.split(",").map(Number);
    return new Position(x!, y!, z!);
  }
}

export const NORTH = new Position(0, 0, -1);
export const SOUTH = new Position(0, 0, 1);
export const EAST = new Position(1, 0, 0);
export const WEST = new Position(-1, 0, 0);
export const UP = new Position(0, 1, 0);
export const DOWN = new Position(0, -1, 0);

export const HORIZONTAL_OFFSETS: Position[] = [NORTH, SOUTH, EAST, WEST];
export const NEIGHBOR_OFFSETS: Position[] = [...HORIZONTAL_OFFSETS, UP, DOWN];
