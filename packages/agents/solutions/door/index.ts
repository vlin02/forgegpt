import { Engine, Position, EAST, WEST, NORTH, SOUTH, UP, DOWN, Lever, Piston, RedstoneDust, OpaqueBlock } from "block";

export function build(engine: Engine): void {
	const P = (x: number, y: number, z: number) => new Position(x, y, z);
	const solid = (x: number, y: number, z: number) => engine.setBlock(P(x, y, z), new OpaqueBlock());
	const dust = (x: number, y: number, z: number) => engine.setBlock(P(x, y, z), new RedstoneDust());
	const piston = (x: number, y: number, z: number, facing: Position) => engine.setBlock(P(x, y, z), new Piston(facing));
	const lever = (x: number, y: number, z: number, attach: Position) => engine.setBlock(P(x, y, z), new Lever(attach));

	// Door 2×2 at x=0 (CLOSED)
	solid(0, 0, 0);
	solid(0, 1, 0);
	solid(0, 0, 1);
	solid(0, 1, 1);

	// OPEN bank (push east)
	piston(-1, 0, 0, EAST);
	piston(-1, 1, 0, EAST);
	piston(-1, 0, 1, EAST);
	piston(-1, 1, 1, EAST);
	// Face-adjacent solids for OPEN bank (power cells)
	solid(-2, 0, 0);
	solid(-2, 1, 0);
	solid(-2, 0, 1);
	solid(-2, 1, 1);

	// CLOSE bank (push west)
	piston(3, 0, 0, WEST);
	piston(3, 1, 0, WEST);
	piston(3, 0, 1, WEST);
	piston(3, 1, 1, WEST);
	// Face-adjacent solids for CLOSE bank
	solid(4, 0, 0);
	solid(4, 1, 0);
	solid(4, 0, 1);
	solid(4, 1, 1);

	// Backbone supports and dust at y=1 across z in {0,1}
	const supportXs = [-3, -2, -1, 2, 3, 4];
	for (const z of [0, 1]) {
		for (const x of supportXs) solid(x, 0, z);
		for (let x = -3; x <= 4; x++) dust(x, 1, z);
	}

	// Lever mount and lever
	solid(-5, 1, 0);
	solid(-5, 0, 0);
	lever(-4, 1, 0, WEST);
}
