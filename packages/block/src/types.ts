export type Position = { x: number; y: number; z: number };
export type PowerLevel = number;

export const BlockType = {
  SOLID: "solid",
  LEVER: "lever",
  DUST: "dust",
  PISTON: "piston",
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];
