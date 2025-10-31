import { RedstoneSimulator } from "./simulator.js";
import { Lever } from "./blocks/lever.js";
import { GenericSolidBlock } from "./blocks/solid.js";
import { RedstoneDust } from "./blocks/dust.js";
import { Piston } from "./blocks/piston.js";

const sim = new RedstoneSimulator();

sim.setBlock({ x: 0, y: 0, z: 0 }, new GenericSolidBlock());
sim.setBlock({ x: 1, y: 0, z: 0 }, new GenericSolidBlock());
sim.setBlock({ x: 2, y: 0, z: 0 }, new GenericSolidBlock());
sim.setBlock({ x: 3, y: 0, z: 0 }, new GenericSolidBlock());

sim.setBlock({ x: 0, y: 1, z: 0 }, new Lever({ x: 0, y: -1, z: 0 }));
sim.setBlock({ x: 1, y: 1, z: 0 }, new RedstoneDust());
sim.setBlock({ x: 2, y: 1, z: 0 }, new RedstoneDust());
sim.setBlock({ x: 3, y: 1, z: 0 }, new RedstoneDust());
sim.setBlock({ x: 4, y: 1, z: 0 }, new Piston());

console.log("T0 (initial):");
console.log(sim.render());

sim.toggleLever({ x: 0, y: 1, z: 0 });
console.log("\nT0 (lever toggled):");
console.log(sim.render());

sim.tick();
console.log("\nT1:");
console.log(sim.render());

sim.tick();
console.log("\nT2:");
console.log(sim.render());

sim.tick();
console.log("\nT3:");
console.log(sim.render());

sim.tick();
console.log("\nT4:");
console.log(sim.render());

console.log("\n=== TURNING LEVER OFF ===\n");

sim.toggleLever({ x: 0, y: 1, z: 0 });
console.log("T4 (lever toggled off):");
console.log(sim.render());

sim.tick();
console.log("\nT5:");
console.log(sim.render());

sim.tick();
console.log("\nT6:");
console.log(sim.render());

sim.tick();
console.log("\nT7:");
console.log(sim.render());

sim.tick();
console.log("\nT8:");
console.log(sim.render());

sim.tick();
console.log("\nT9:");
console.log(sim.render());

sim.tick();
console.log("\nT10:");
console.log(sim.render());

for (let i = 11; i <= 20; i++) {
  sim.tick();
}
console.log("\nT20:");
console.log(sim.render());
