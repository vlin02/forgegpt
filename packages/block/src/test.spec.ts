import { test, expect } from "vitest";
import {
  Position,
  DOWN as D,
  EAST as E,
  WEST as W,
  NORTH as N,
  SOUTH as S,
  UP as U,
} from "./position.js";
import { OpaqueBlock, RedstoneDust, Piston, Lever } from "./blocks.js";
import { Engine } from "./engine.js";

const at = (x: number, y: number, z: number) => new Position(x, y, z);

test("core spec features", () => {
  const sim = new Engine();

  const base0 = new OpaqueBlock();
  sim.setBlock(at(0, 0, 0), base0);
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 1), new OpaqueBlock());
  const baseWeak = new OpaqueBlock();
  sim.setBlock(at(2, 1, 1), baseWeak);
  sim.setBlock(at(3, 0, 1), new OpaqueBlock());
  sim.setBlock(at(4, 0, 0), new OpaqueBlock());
  const blockToPush = new OpaqueBlock();
  sim.setBlock(at(5, 1, 1), blockToPush);
  sim.setBlock(at(5, 0, 0), new OpaqueBlock());
  sim.setBlock(at(0, 0, 1), new OpaqueBlock());
  sim.setBlock(at(1, 1, 2), new OpaqueBlock());
  sim.setBlock(at(0, 1, 0), new Lever(D));
  const dust1 = new RedstoneDust();
  sim.setBlock(at(1, 1, 0), dust1);
  const dust2 = new RedstoneDust();
  sim.setBlock(at(1, 1, 1), dust2);
  const dustIsolated = new RedstoneDust();
  sim.setBlock(at(3, 1, 1), dustIsolated);
  sim.setBlock(at(5, 1, 0), new RedstoneDust());
  sim.setBlock(at(5, 2, 1), new RedstoneDust());
  const dustVertLower = new RedstoneDust();
  sim.setBlock(at(0, 1, 1), dustVertLower);
  const dustVertUpper = new RedstoneDust();
  sim.setBlock(at(1, 2, 2), dustVertUpper);
  sim.setBlock(at(4, 1, 0), new Lever(D));
  const piston = new Piston(E);
  sim.setBlock(at(4, 1, 1), piston);

  expect(piston.extended).toBe(false);

  sim.toggleLever(at(0, 1, 0));
  sim.toggleLever(at(4, 1, 0));
  sim.tick();

  expect(base0.power).toBe(15);
  expect(dust1.power).toBe(15);
  expect(dust2.power).toBe(14);
  expect(baseWeak.power).toBe(14);
  expect(dustIsolated.power).toBe(0);
  expect(dustVertLower.power).toBe(15);
  expect(dustVertUpper.power).toBe(13);
  expect(piston.extended).toBe(true);
  expect(sim.getBlock(at(6, 1, 1))).toBe(blockToPush);
  expect(sim.getBlock(at(5, 2, 1))).toBeUndefined();

  sim.toggleLever(at(4, 1, 0));
  sim.removeBlock(at(1, 0, 0));
  sim.tick();

  expect(sim.getBlock(at(1, 1, 0))).toBeUndefined();
  expect(piston.extended).toBe(false);

  sim.removeBlock(at(0, 0, 0));
  sim.tick();

  expect(sim.getBlock(at(0, 1, 0))).toBeUndefined();
});

test("piston failures and multi-block push", () => {
  const sim = new Engine();

  // pistonNoSink contraption at x=0
  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const pistonNoSink = new Piston(E);
  sim.setBlock(at(0, 1, 0), pistonNoSink);
  sim.setBlock(at(1, 1, 0), new OpaqueBlock());
  sim.setBlock(at(0, 1, 0), new Lever(D)); // overwrites piston

  // pistonImmovable contraption at x=2
  sim.setBlock(at(2, 0, 0), new OpaqueBlock());
  const pistonImmovable = new Piston(E);
  sim.setBlock(at(2, 1, 0), pistonImmovable);
  sim.setBlock(at(3, 1, 0), new Piston(W)); // opposing piston
  sim.setBlock(at(2, 1, 0), new Lever(D)); // overwrites piston

  // pistonTooMany contraption at x=4
  sim.setBlock(at(4, 0, 0), new OpaqueBlock());
  const pistonTooMany = new Piston(E);
  sim.setBlock(at(4, 1, 0), pistonTooMany);
  for (let i = 0; i < 13; i++) {
    sim.setBlock(at(5 + i, 1, 0), new OpaqueBlock());
  }
  sim.setBlock(at(4, 1, 0), new Lever(D)); // overwrites piston

  // pistonMulti contraption at z=2
  sim.setBlock(at(0, 0, 2), new OpaqueBlock());
  const pistonMulti = new Piston(E);
  sim.setBlock(at(0, 1, 2), pistonMulti);
  sim.setBlock(at(1, 1, 2), new OpaqueBlock());
  sim.setBlock(at(2, 1, 2), new Lever(W));
  sim.setBlock(at(3, 1, 2), new OpaqueBlock());
  const block3 = new OpaqueBlock();
  sim.setBlock(at(4, 1, 2), block3);
  sim.setBlock(at(4, 2, 2), new Lever(W));

  sim.toggleLever(at(0, 1, 0));
  sim.toggleLever(at(2, 1, 0));
  sim.toggleLever(at(4, 1, 0));
  sim.toggleLever(at(2, 1, 2));
  sim.tick();

  expect(pistonNoSink.extended).toBe(false);
  expect(pistonImmovable.extended).toBe(false);
  expect(pistonTooMany.extended).toBe(false);
  expect(pistonMulti.extended).toBe(true);
  expect(sim.getBlock(at(2, 1, 2))).toBeInstanceOf(OpaqueBlock);
  expect(sim.getBlock(at(5, 1, 2))).toBe(block3);
  expect(sim.getBlock(at(4, 2, 2))).toBeUndefined();
});

test("weakly-powered block activates piston", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 1), new OpaqueBlock());
  sim.setBlock(at(0, 1, 0), new Lever(D));
  sim.setBlock(at(1, 1, 0), new RedstoneDust());
  sim.setBlock(at(1, 1, 1), new RedstoneDust());
  const weakBlock = new OpaqueBlock();
  sim.setBlock(at(2, 1, 1), weakBlock);
  const pistonWeak = new Piston(W);
  sim.setBlock(at(3, 1, 1), pistonWeak);

  sim.toggleLever(at(0, 1, 0));
  sim.tick();

  expect(weakBlock.power).toBeGreaterThan(0);
  expect(pistonWeak.extended).toBe(true);
});

test("dust shape: dot does not activate adjacent piston", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const dustDot = new RedstoneDust();
  sim.setBlock(at(0, 1, 0), dustDot);
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  const pistonDot = new Piston(W);
  sim.setBlock(at(1, 1, 0), pistonDot);
  sim.setBlock(at(0, 0, 0), new Lever(D));

  sim.toggleLever(at(0, 0, 0));
  sim.tick();

  expect(dustDot.connectedDirs.size).toBe(0);
  expect(pistonDot.extended).toBe(false);
});

test("dust shape: cross activates adjacent piston", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(2, 0, 0), new OpaqueBlock());
  sim.setBlock(at(2, 1, 0), new RedstoneDust());
  const dustCross = new RedstoneDust();
  sim.setBlock(at(1, 1, 0), dustCross);
  sim.setBlock(at(3, 1, 0), new OpaqueBlock());
  const pistonCross = new Piston(W);
  sim.setBlock(at(3, 2, 0), pistonCross);
  sim.setBlock(at(0, 1, 0), new Lever(D));

  sim.toggleLever(at(0, 1, 0));
  sim.tick();

  expect(dustCross.connectedDirs.size).toBeGreaterThan(0);
  expect(pistonCross.extended).toBe(true);
});

test("QC requires block update", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const pistonQC = new Piston(E);
  sim.setBlock(at(0, 1, 0), pistonQC);
  sim.setBlock(at(0, 2, 0), new OpaqueBlock());
  sim.setBlock(at(0, 3, 0), new Lever(D));

  sim.toggleLever(at(0, 3, 0));
  sim.tick();

  expect(pistonQC.extended).toBe(true);

  sim.setBlock(at(1, 1, 0), new OpaqueBlock());
  sim.tick();

  expect(pistonQC.extended).toBe(true);
});

test("up-facing piston exception", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const pistonUp = new Piston(U);
  sim.setBlock(at(0, 1, 0), pistonUp);
  sim.setBlock(at(0, 2, 0), new OpaqueBlock());
  sim.setBlock(at(0, 3, 0), new Lever(D));

  sim.toggleLever(at(0, 3, 0));
  sim.tick();

  expect(pistonUp.extended).toBe(false);
});

test("opaque block above prevents vertical step connection", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const dustLower = new RedstoneDust();
  sim.setBlock(at(0, 1, 0), dustLower);
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  const dustUpper = new RedstoneDust();
  sim.setBlock(at(1, 2, 0), dustUpper);
  sim.setBlock(at(0, 2, 0), new OpaqueBlock());
  sim.setBlock(at(-1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(-1, 1, 0), new Lever(D));

  sim.toggleLever(at(-1, 1, 0));
  sim.tick();

  expect(dustLower.power).toBe(15);
  expect(dustUpper.power).toBe(0);
});

test("solid block cuts vertical step connection", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(2, 0, 0), new OpaqueBlock());
  const dustLower = new RedstoneDust();
  sim.setBlock(at(0, 1, 0), dustLower);
  const dustMid = new RedstoneDust();
  sim.setBlock(at(1, 1, 0), dustMid);
  const dustUpper = new RedstoneDust();
  sim.setBlock(at(2, 2, 0), dustUpper);
  sim.setBlock(at(-1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(-1, 1, 0), new Lever(D));

  sim.toggleLever(at(-1, 1, 0));
  sim.tick();

  expect(dustLower.power).toBe(15);
  expect(dustMid.power).toBe(14);
  expect(dustUpper.power).toBe(0);
});

test("weak-only powered block cannot power adjacent dust", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  const weakBlock = new OpaqueBlock();
  sim.setBlock(at(2, 0, 0), weakBlock);
  sim.setBlock(at(3, 0, 0), new OpaqueBlock());
  sim.setBlock(at(0, 1, 0), new Lever(D));
  sim.setBlock(at(1, 1, 0), new RedstoneDust());
  sim.setBlock(at(2, 1, 0), new RedstoneDust());
  const adjacentDust = new RedstoneDust();
  sim.setBlock(at(2, 0, 1), adjacentDust);

  sim.toggleLever(at(0, 1, 0));
  sim.tick();

  expect(weakBlock.power).toBeGreaterThan(0);
  expect(adjacentDust.power).toBe(0);
});

test("lever/dust destruction and 12-block limit bypass", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const piston = new Piston(E);
  sim.setBlock(at(0, 1, 0), piston);
  sim.setBlock(at(1, 0, 0), new OpaqueBlock());
  sim.setBlock(at(1, 1, 0), new RedstoneDust());
  const block1 = new OpaqueBlock();
  sim.setBlock(at(2, 1, 0), block1);
  sim.setBlock(at(3, 1, 0), new Lever(W));
  const block2 = new OpaqueBlock();
  sim.setBlock(at(4, 1, 0), block2);
  sim.setBlock(at(-1, 1, 0), new OpaqueBlock());
  sim.setBlock(at(-1, 1, 1), new Lever(N));

  sim.toggleLever(at(-1, 1, 1));
  sim.tick();

  expect(piston.extended).toBe(true);
  expect(sim.getBlock(at(1, 1, 0))).toBeUndefined();
  expect(sim.getBlock(at(2, 1, 0))).toBeUndefined();
  expect(sim.getBlock(at(3, 1, 0))).toBe(block1);
  expect(sim.getBlock(at(5, 1, 0))).toBe(block2);
});

test("block above dust does not remove dust", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const dust = new RedstoneDust();
  sim.setBlock(at(0, 1, 0), dust);

  sim.setBlock(at(0, 2, 0), new OpaqueBlock());
  sim.tick();

  expect(sim.getBlock(at(0, 1, 0))).toBe(dust);
});

test("piston retraction", () => {
  const sim = new Engine();

  sim.setBlock(at(0, 0, 0), new OpaqueBlock());
  const piston = new Piston(E);
  sim.setBlock(at(0, 1, 0), piston);
  sim.setBlock(at(1, 1, 0), new OpaqueBlock());
  sim.setBlock(at(0, 2, 0), new OpaqueBlock());
  sim.setBlock(at(0, 3, 0), new Lever(D));

  sim.toggleLever(at(0, 3, 0));
  sim.tick();

  expect(piston.extended).toBe(true);
  expect(sim.getBlock(at(2, 1, 0))).toBeInstanceOf(OpaqueBlock);

  sim.toggleLever(at(0, 3, 0));
  sim.tick();

  expect(piston.extended).toBe(false);
  expect(sim.getBlock(at(2, 1, 0))).toBeInstanceOf(OpaqueBlock);
});

test("placement validation", () => {
  const sim = new Engine();

  expect(sim.setBlock(at(0, 0, 0), new RedstoneDust())).toBe(false);
  sim.setBlock(at(0, -1, 0), new OpaqueBlock());
  expect(sim.setBlock(at(0, 0, 0), new RedstoneDust())).toBe(true);

  expect(sim.setBlock(at(1, 0, 0), new Lever(D))).toBe(false);
  sim.setBlock(at(1, -1, 0), new OpaqueBlock());
  expect(sim.setBlock(at(1, 0, 0), new Lever(D))).toBe(true);

  const piston = new Piston(U);
  sim.setBlock(at(2, 0, 0), piston);
  expect(sim.setBlock(at(2, 1, 0), new RedstoneDust())).toBe(false);

  expect(sim.setBlock(at(3, 1, 0), new Lever(at(0, -1, 0)))).toBe(false);
});
