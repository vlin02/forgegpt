import { Builder, Engine, Position, EAST, WEST, NORTH, SOUTH, UP, DOWN } from "block";

export function build(engine: Engine): void {
	const b = new Builder(engine);

	// Door: 2×2 opaque blocks at x=0, y=0..1, z=0..1 (CLOSED)
	b.move(new Position(0, 0, 0));
	b.solid(); // (0,0,0)
	b.move(UP); b.solid(); // (0,1,0)
	b.move(DOWN); b.move(SOUTH); b.solid(); // (0,0,1)
	b.move(UP); b.solid(); // (0,1,1)

	// OPEN bank: pistons at x=-1 facing EAST to push door to x=1
	b.move(WEST); b.move(DOWN); b.move(NORTH); // (-1,0,0)
	b.piston(EAST);
	b.move(UP); // (-1,1,0)
	b.piston(EAST);
	b.move(SOUTH); // (-1,1,1)
	b.piston(EAST);
	b.move(DOWN); // (-1,0,1)
	b.piston(EAST);

	// OPEN bank control solids adjacent to pistons (west side)
	b.move(WEST); // (-2,0,1)
	b.solid();
	b.move(NORTH); // (-2,0,0)
	b.solid();
	b.move(UP); // (-2,1,0)
	b.solid();
	b.move(SOUTH); // (-2,1,1)
	b.solid();

	// CLOSE bank: pistons at x=3 facing WEST to push door back to x=0
	b.move(EAST); b.move(EAST); b.move(EAST); // (1,1,1) -> (4,1,1)
	b.move(EAST); // (5,1,1)
	b.move(WEST); // keep cursor consistent
	b.move(WEST); b.move(WEST); b.move(WEST); // back to (2,1,1)
	b.move(EAST); b.move(EAST); // ensure correct position
	// Position to first piston base (3,0,0)
	b.move(EAST); b.move(EAST); b.move(NORTH); b.move(DOWN); // (3,0,0)
	b.piston(WEST);
	b.move(UP); // (3,1,0)
	b.piston(WEST);
	b.move(SOUTH); // (3,1,1)
	b.piston(WEST);
	b.move(DOWN); // (3,0,1)
	b.piston(WEST);

	// CLOSE bank control solids adjacent to pistons (east side at x=4)
	b.move(EAST); // (4,0,1)
	b.solid();
	b.move(NORTH); // (4,0,0)
	b.solid();
	b.move(UP); // (4,1,0)
	b.solid();
	b.move(SOUTH); // (4,1,1)
	b.solid();

	// Power backbone: single Lever seeding a dust highway at y=1
	// Mount lever on solid at (-5,1,0), place lever at (-4,1,0) attached WEST
	b.move(WEST); b.move(WEST); b.move(WEST); b.move(WEST); b.move(WEST); // to ( -1,1,1 ) - adjust back toward west
	b.move(WEST); b.move(WEST); b.move(WEST); // ensure far west
	// Ensure supports under highway y=1 except at x=0 and x=1 (gated by door)
	const supportXs = [-3, -2, -1, 2, 3, 4];
	for (const z of [0, 1]) {
		for (const x of supportXs) {
			b.move(new Position(x - b.getCursor().x, -b.getCursor().y, z - b.getCursor().z));
			b.solid();
		}
	}
	// Place solid for lever mount and its support
	b.move(new Position(-5 - b.getCursor().x, 1 - b.getCursor().y, 0 - b.getCursor().z));
	b.solid(); // (-5,1,0)
	b.move(DOWN); // (-5,0,0)
	b.solid();
	// Lever
	b.move(EAST); // (-4,0,0)
	b.move(UP); // (-4,1,0)
	b.lever(WEST);

	// Dust highway at y=1 across z=0 and z=1 from x=-3..4
	for (const z of [0, 1]) {
		for (let x = -3; x <= 4; x++) {
			b.move(new Position(x - b.getCursor().x, 1 - b.getCursor().y, z - b.getCursor().z));
			b.dust();
		}
	}

	// The highway includes cells (0,1,*) and (1,1,*) whose supports are the door blocks at x=0 (CLOSED) and x=1 (OPEN),
	// gating power to OPEN bank (x=-2 side) vs CLOSE bank (x=4 side) respectively.
}
