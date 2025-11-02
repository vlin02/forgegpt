import { Builder, DOWN, EAST, WEST, NORTH, SOUTH, UP, Position } from "./builder.js";
import { OpaqueBlock, RedstoneDust, Piston } from "./blocks.js";
import { Engine } from "./engine.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const sim = new Engine();
const b = new Builder(sim);

b.solid().save("base0")
  .move(EAST).solid().save("base1")
  .move(SOUTH).solid().save("base2")
  .move(EAST).move(UP).solid().save("baseWeak")
  .move(DOWN).move(EAST).solid().save("baseIsolated")
  .move(EAST).move(NORTH).solid().save("basePiston")
  .move(EAST).move(SOUTH).move(UP).solid().save("blockToPush")
  .move(DOWN).move(NORTH).solid().save("baseDustOnBlock")
  .at(0, 0, 1).solid().save("baseVertLower")
  .move(EAST).move(SOUTH).move(UP).solid().save("baseVertUpper")
  .at(0, 1, 0).lever(DOWN)
  .move(EAST).dust().save("dust1")
  .move(SOUTH).dust().save("dust2")
  .move(EAST.mul(2)).dust().save("dustIsolated")
  .at(5, 1, 0).dust()
  .move(SOUTH).move(UP).dust()
  .at(0, 1, 1).dust().save("dustVertLower")
  .move(EAST).move(UP).move(SOUTH).dust().save("dustVertUpper")
  .at(4, 1, 0).lever(DOWN)
  .move(SOUTH).piston(EAST).save("piston");

const base0 = b.ref("base0") as OpaqueBlock;
const baseWeak = b.ref("baseWeak") as OpaqueBlock;
const blockToPush = b.ref("blockToPush") as OpaqueBlock;
const dust1 = b.ref("dust1") as RedstoneDust;
const dust2 = b.ref("dust2") as RedstoneDust;
const dustIsolated = b.ref("dustIsolated") as RedstoneDust;
const dustVertLower = b.ref("dustVertLower") as RedstoneDust;
const dustVertUpper = b.ref("dustVertUpper") as RedstoneDust;
const piston = b.ref("piston") as Piston;

assert(!piston.extended, "initial");

sim.toggleLever(new Position(0, 1, 0));
sim.toggleLever(new Position(4, 1, 0));
sim.tick();

assert(base0.power === 15, "strong power");
assert(dust1.power === 15, "weak power from strongly-powered block");
assert(dust2.power === 14, "decay");
assert(baseWeak.power === 14, "block weakly powered by dust");
assert(dustIsolated.power === 0, "weakly-powered block cannot power dust");
assert(dustVertLower.power === 15, "vertical lower dust receives lever power");
assert(dustVertUpper.power === 13, "vertical upper dust via diagonal connection");
assert(piston.extended, "piston pushes block");
assert(sim.getBlock(new Position(6, 1, 1)) === blockToPush, "block moved");
assert(sim.getBlock(new Position(5, 2, 1)) === undefined, "dust breaks on push");

sim.toggleLever(new Position(4, 1, 0));
sim.removeBlock(new Position(1, 0, 0));
sim.tick();

assert(sim.getBlock(new Position(1, 1, 0)) === undefined, "dust breaks");
assert(!piston.extended, "piston retracts");

sim.removeBlock(new Position(0, 0, 0));
sim.tick();

assert(sim.getBlock(new Position(0, 1, 0)) === undefined, "lever breaks");

console.log("✓ All spec features verified");
