import { test, expect } from "vitest";
import { Builder, DOWN as D, EAST as E, WEST as W, NORTH as N, SOUTH as S, UP as U, Position } from "./builder.js";
import { OpaqueBlock, RedstoneDust, Piston, Lever } from "./blocks.js";
import { Engine } from "./engine.js";

test("core spec features", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    const base0 = b.solid();
    b.move(E);
    b.solid();
    b.move(S);
    b.solid();
    b.move(E, U);
    const baseWeak = b.solid();
    b.move(D, E);
    b.solid();
    b.move(E, N);
    b.solid();
    b.move(E, S, U);
    const blockToPush = b.solid();
    b.move(D, N);
    b.solid();
    b.move(W, 5, S);
    b.solid();
    b.move(E, S, U);
    b.solid();
    b.move(W, N, 2);
    b.lever(D);
    b.move(E);
    const dust1 = b.dust();
    b.move(S);
    const dust2 = b.dust();
    b.move(E, 2);
    const dustIsolated = b.dust();
    b.move(E, 2, N);
    b.dust();
    b.move(S, U);
    b.dust();
    b.move(W, 5, D);
    const dustVertLower = b.dust();
    b.move(E, U, S);
    const dustVertUpper = b.dust();
    b.move(E, 3, D, N, 2);
    b.lever(D);
    b.move(S);
    const piston = b.piston(E);

    expect(piston.extended).toBe(false);

    sim.toggleLever(new Position(0, 1, 0));
    sim.toggleLever(new Position(4, 1, 0));
    sim.tick();

    expect(base0.power).toBe(15);
    expect(dust1.power).toBe(15);
    expect(dust2.power).toBe(14);
    expect(baseWeak.power).toBe(14);
    expect(dustIsolated.power).toBe(0);
    expect(dustVertLower.power).toBe(15);
    expect(dustVertUpper.power).toBe(13);
    expect(piston.extended).toBe(true);
    expect(sim.getBlock(new Position(6, 1, 1))).toBe(blockToPush);
    expect(sim.getBlock(new Position(5, 2, 1))).toBeUndefined();

    sim.toggleLever(new Position(4, 1, 0));
    sim.removeBlock(new Position(1, 0, 0));
    sim.tick();

    expect(sim.getBlock(new Position(1, 1, 0))).toBeUndefined();
    expect(piston.extended).toBe(false);

    sim.removeBlock(new Position(0, 0, 0));
    sim.tick();

    expect(sim.getBlock(new Position(0, 1, 0))).toBeUndefined();
});

test("piston failures and multi-block push", () => {
  const sim = new Engine();
  const b = new Builder(sim);

  b.solid();
  b.move(U);
  const pistonNoSink = b.piston(E);
  b.move(E);
  b.solid();
  b.move(W);
  b.lever(D);
  b.move(E, 2, D);
  b.solid();
  b.move(U);
  const pistonImmovable = b.piston(E);
  b.move(E);
  b.piston(W);
  b.move(W);
  b.lever(D);
  b.move(E, 2, D);
  b.solid();
  b.move(U);
  const pistonTooMany = b.piston(E);
  for (let i = 0; i < 13; i++) {
    b.move(E);
    b.solid();
  }
  b.move(W, 13);
  b.lever(D);
  b.move(W, 4, D, S, 2);
  b.solid();
  b.move(U);
  const pistonMulti = b.piston(E);
  b.move(E);
  b.solid();
  b.move(E);
  b.lever(W);
  b.move(E);
  b.solid();
  b.move(E);
  const block3 = b.solid();
  b.move(U);
  b.lever(W);

  sim.toggleLever(new Position(0, 1, 0));
  sim.toggleLever(new Position(2, 1, 0));
  sim.toggleLever(new Position(4, 1, 0));
  sim.toggleLever(new Position(2, 1, 2));
  sim.tick();

  expect(pistonNoSink.extended).toBe(false);
  expect(pistonImmovable.extended).toBe(false);
  expect(pistonTooMany.extended).toBe(false);
  expect(pistonMulti.extended).toBe(true);
  expect(sim.getBlock(new Position(2, 1, 2))).toBeInstanceOf(OpaqueBlock);
  expect(sim.getBlock(new Position(5, 1, 2))).toBe(block3);
  expect(sim.getBlock(new Position(5, 2, 2))).toBeUndefined();
});

test("weakly-powered block activates piston", () => {
  const sim = new Engine();
  const b = new Builder(sim);

  b.solid();
  b.move(E);
  b.solid();
  b.move(S);
  b.solid();
  b.move(W, U, N);
  b.lever(D);
  b.move(E);
  b.dust();
  b.move(S);
  b.dust();
  b.move(E);
  const weakBlock = b.solid();
  b.move(E);
  const pistonWeak = b.piston(W);

  sim.toggleLever(new Position(0, 1, 0));
  sim.tick();

  expect(weakBlock.power).toBeGreaterThan(0);
  expect(pistonWeak.extended).toBe(true);
});

test("dust shape: dot vs cross", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(U);
    const dustDot = b.dust();
    b.move(E, D);
    b.solid();
    b.move(U);
    const pistonDot = b.piston(W);
    b.move(W, 2);
    b.lever(D);

  sim.toggleLever(new Position(0, 0, 0));
  sim.tick();

    expect(dustDot.connectedDirs.size).toBe(0);
    expect(pistonDot.extended).toBe(false);

    const sim2 = new Engine();
    const b2 = new Builder(sim2);

    b2.solid();
    b2.move(E);
    b2.solid();
    b2.move(E);
    b2.solid();
    b2.move(U);
    b2.dust();
    b2.move(W);
    const dustCross = b2.dust();
    b2.move(E, 2);
    b2.solid();
    b2.move(U);
    const pistonCross = b2.piston(W);
    b2.move(W, 3, D);
    b2.lever(D);

    sim2.toggleLever(new Position(0, 1, 0));
    sim2.tick();

    expect(dustCross.connectedDirs.size).toBeGreaterThan(0);
    expect(pistonCross.extended).toBe(true);
});

test("QC requires block update", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(U);
    const pistonQC = b.piston(E);
    b.move(U);
    b.solid();
    b.move(U);
    b.lever(D);

    sim.toggleLever(new Position(0, 3, 0));
    sim.tick();

    expect(pistonQC.extended).toBe(true);

    sim.setBlock(new Position(1, 1, 0), new OpaqueBlock());
    sim.tick();
    
    expect(pistonQC.extended).toBe(true);
});

test("up-facing piston exception", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(U);
    const pistonUp = b.piston(U);
    b.move(U);
    b.solid();
    b.move(U);
    b.lever(D);

    sim.toggleLever(new Position(0, 3, 0));
    sim.tick();

    expect(pistonUp.extended).toBe(false);
});

test("vertical step cutting and opaque-above prevention", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(U);
    const dustLower = b.dust();
    b.move(E, D);
    b.solid();
    b.move(U, 2);
    const dustUpper = b.dust();
    b.move(W);
    b.solid();
    b.move(W, D, 2);
    b.solid();
    b.move(U);
    b.lever(D);

    sim.toggleLever(new Position(-1, 1, 0));
    sim.tick();

    expect(dustLower.power).toBe(15);
    expect(dustUpper.power).toBe(0);

    const sim2 = new Engine();
    const b2 = new Builder(sim2);
    b2.solid();
    b2.move(U);
    const dust2Lower = b2.dust();
    b2.move(E);
    const dust2Horiz = b2.dust();
    b2.move(D);
    b2.solid();
    b2.move(U, 2);
    const dust2Upper = b2.dust();
    b2.move(W);
    b2.solid();
    b2.move(W, D, 2);
    b2.solid();
    b2.move(U);
    b2.lever(D);

    sim2.toggleLever(new Position(-1, 1, 0));
    sim2.tick();

    expect(dust2Lower.power).toBe(15);
    expect(dust2Horiz.power).toBe(14);
    expect(dust2Upper.power).toBe(0);
});

test("weak-only powered block cannot power adjacent dust", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(E);
    b.solid();
    b.move(E);
    const weakBlock = b.solid();
    b.move(E);
    b.solid();
    b.move(W, 3, U);
    b.lever(D);
    b.move(E);
    b.dust();
    b.move(E);
    b.dust();
    b.move(D, S);
    const adjacentDust = b.dust();

    sim.toggleLever(new Position(0, 1, 0));
    sim.tick();

    expect(weakBlock.power).toBeGreaterThan(0);
    expect(adjacentDust.power).toBe(0);
});

test("lever/dust destruction and 12-block limit bypass", () => {
    const sim = new Engine();
    const b = new Builder(sim);

    b.solid();
    b.move(U);
    const piston = b.piston(E);
    b.move(E, D);
    b.solid();
    b.move(U);
    b.dust();
    b.move(E);
    const block1 = b.solid();
    b.move(E);
    b.lever(W);
    b.move(E);
    const block2 = b.solid();
    b.move(W, 5);
    b.solid();
    b.move(S);
    b.lever(N);

    sim.toggleLever(new Position(-1, 1, 1));
    sim.tick();

    expect(piston.extended).toBe(true);
    expect(sim.getBlock(new Position(1, 1, 0))).toBeUndefined();
    expect(sim.getBlock(new Position(2, 1, 0))).toBeUndefined();
    expect(sim.getBlock(new Position(3, 1, 0))).toBe(block1);
    expect(sim.getBlock(new Position(5, 1, 0))).toBe(block2);
});

test("2-wide piston door (single lever powers two up pistons)", () => {
  const sim = new Engine();

  // Pistons at Y=1, facing up
  const piston1 = new Piston(U);
  const piston2 = new Piston(U);
  sim.setBlock(new Position(0, 1, 0), piston1);
  sim.setBlock(new Position(2, 1, 0), piston2);

  // Blocks to be pushed at Y=2
  const blockA = new OpaqueBlock();
  const blockB = new OpaqueBlock();
  sim.setBlock(new Position(0, 2, 0), blockA);
  sim.setBlock(new Position(2, 2, 0), blockB);

  // Shared adjacent block between pistons at Y=1 (will be weak-powered by dust below)
  sim.setBlock(new Position(1, 1, 0), new OpaqueBlock());

  // Supports under dust/lever (Y=-1)
  sim.setBlock(new Position(-1, -1, 0), new OpaqueBlock());
  sim.setBlock(new Position(0, -1, 0), new OpaqueBlock());
  sim.setBlock(new Position(1, -1, 0), new OpaqueBlock());

  // Dust network at Y=0: lever -> dust -> dust (non-dot)
  sim.setBlock(new Position(0, 0, 0), new RedstoneDust());
  sim.setBlock(new Position(1, 0, 0), new RedstoneDust());
  sim.setBlock(new Position(-1, 0, 0), new Lever(D));

  // Initial state
  expect(piston1.extended).toBe(false);
  expect(piston2.extended).toBe(false);
  expect(sim.getBlock(new Position(0, 2, 0))).toBe(blockA);
  expect(sim.getBlock(new Position(2, 2, 0))).toBe(blockB);

  // ON -> both pistons extend same tick, pushing blocks up to Y=3
  sim.toggleLever(new Position(-1, 0, 0));
  sim.tick();
  expect(piston1.extended).toBe(true);
  expect(piston2.extended).toBe(true);
  expect(sim.getBlock(new Position(0, 3, 0))).toBe(blockA);
  expect(sim.getBlock(new Position(2, 3, 0))).toBe(blockB);

  // OFF -> pistons retract, pushed blocks remain at Y=3 (non-sticky)
  sim.toggleLever(new Position(-1, 0, 0));
  sim.tick();
  expect(piston1.extended).toBe(false);
  expect(piston2.extended).toBe(false);
  expect(sim.getBlock(new Position(0, 3, 0))).toBe(blockA);
  expect(sim.getBlock(new Position(2, 3, 0))).toBe(blockB);
  expect(sim.getBlock(new Position(0, 0, 0))).toBeInstanceOf(RedstoneDust);
  expect(sim.getBlock(new Position(-1, 0, 0))).toBeInstanceOf(Lever);
});

 
