import { RedstoneSimulator } from "./simulator.js";
import { Lever, GenericSolidBlock, RedstoneDust, Piston } from "./blocks.js";

function linearPowerTest() {
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

  const show = (label: string) => {
    console.log(`\n${label}:`);
    console.log(sim.render());
  };

  const tickAndShow = (count: number) => {
    for (let i = 0; i < count; i++) {
      sim.tick();
      show(`T${sim.getTick()}`);
    }
  };

  show("T0 (initial)");

  sim.toggleLever({ x: 0, y: 1, z: 0 });
  show("T0 (lever toggled)");

  tickAndShow(4);

  console.log("\n=== TURNING LEVER OFF ===");
  sim.toggleLever({ x: 0, y: 1, z: 0 });
  show("T4 (lever toggled off)");

  tickAndShow(6);

  for (let i = 0; i < 10; i++) sim.tick();
  show("T20");
}

function tJunctionTest() {
  const sim = new RedstoneSimulator();

  sim.setBlock({ x: 0, y: 0, z: 0 }, new GenericSolidBlock());
  sim.setBlock({ x: 1, y: 0, z: 0 }, new GenericSolidBlock());
  sim.setBlock({ x: 2, y: 0, z: 0 }, new GenericSolidBlock());
  sim.setBlock({ x: 3, y: 0, z: 0 }, new GenericSolidBlock());
  sim.setBlock({ x: 1, y: 0, z: 1 }, new GenericSolidBlock());

  sim.setBlock({ x: 0, y: 1, z: 0 }, new Lever({ x: 1, y: 0, z: 0 }));
  sim.setBlock({ x: 1, y: 1, z: 0 }, new RedstoneDust());
  sim.setBlock({ x: 2, y: 1, z: 0 }, new RedstoneDust());
  sim.setBlock({ x: 3, y: 1, z: 0 }, new RedstoneDust());
  sim.setBlock({ x: 4, y: 1, z: 0 }, new Piston());
  sim.setBlock({ x: 1, y: 1, z: 1 }, new Lever({ x: 0, y: -1, z: 0 }));

  const show = (label: string) => {
    console.log(`\n${label}:`);
    console.log(sim.render());
  };

  console.log("\n=== T-JUNCTION TEST ===");
  show("Initial");

  sim.toggleLever({ x: 1, y: 1, z: 1 });
  show("L1 on");
  sim.tick();
  show("T1");

  sim.toggleLever({ x: 0, y: 1, z: 0 });
  show("L1+L2 on");
  sim.tick();
  show("T2");

  sim.toggleLever({ x: 1, y: 1, z: 1 });
  show("L2 on only");
  sim.tick();
  show("T3");

  sim.toggleLever({ x: 0, y: 1, z: 0 });
  show("Both off");
  sim.tick();
  show("T4");
}

linearPowerTest();
tJunctionTest();
