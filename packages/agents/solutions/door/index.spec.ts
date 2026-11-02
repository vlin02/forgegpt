import { test, expect } from "vitest";
import { Engine, Position, EAST, WEST } from "block";
import type { Block } from "block";
import { Lever, Piston, OpaqueBlock } from "block";
import { build } from "./index.js";

function getAll(engine: Engine) {
	const blocks: { pos: Position; block: Block }[] = [];
	for (const [key, block] of engine.getAllBlocks()) {
		blocks.push({ pos: Position.fromKey(key), block });
	}
	return blocks;
}

function isDoorBlockAt(engine: Engine, x: number): boolean {
	const coords = [
		new Position(x, 0, 0), new Position(x, 1, 0),
		new Position(x, 0, 1), new Position(x, 1, 1),
	];
	return coords.every(p => engine.getBlock(p)?.type === "solid");
}

function getLever(engine: Engine): { pos: Position; lever: Lever } {
	for (const { pos, block } of getAll(engine)) {
		if (block.type === "lever") return { pos, lever: block };
	}
	throw new Error("lever not found");
}

function getBanks(engine: Engine) {
	const openBank: { pos: Position; piston: Piston }[] = [];
	const closeBank: { pos: Position; piston: Piston }[] = [];
	for (const { pos, block } of getAll(engine)) {
		if (block.type !== "piston") continue;
		const piston = block as Piston;
		const facing = piston.facing.toKey();
		if (facing === EAST.toKey()) openBank.push({ pos, piston });
		if (facing === WEST.toKey()) closeBank.push({ pos, piston });
	}
	return { openBank, closeBank };
}

function maxPushLine(engine: Engine, bank: { pos: Position; piston: Piston }[]): number {
	let maxLen = 0;
	for (const { pos, piston } of bank) {
		let cur = pos.add(piston.facing);
		let len = 0;
		while (true) {
			const b = engine.getBlock(cur);
			if (!b) break;
			if (b.type !== "solid") break;
			len++;
			cur = cur.add(piston.facing);
		}
		if (len > maxLen) maxLen = len;
	}
	return maxLen;
}

test("Single-Lever 2×2 Flush Translator Door", () => {
	const engine = new Engine();
	build(engine);
	engine.tick();

	// I/O
	const leverCount = getAll(engine).filter(x => x.block.type === "lever").length;
	expect(leverCount).toBe(1);
	const { openBank, closeBank } = getBanks(engine);
	expect(openBank.length).toBeGreaterThanOrEqual(2);
	expect(closeBank.length).toBeGreaterThanOrEqual(2);

	// Push constraints
	expect(maxPushLine(engine, openBank)).toBeLessThanOrEqual(12);
	expect(maxPushLine(engine, closeBank)).toBeLessThanOrEqual(12);

	// Sink beyond push line free
	for (const { pos, piston } of [...openBank, ...closeBank]) {
		let cur = pos.add(piston.facing);
		let lastSolid: Position | null = null;
		while (true) {
			const b2 = engine.getBlock(cur);
			if (!b2) break;
			if (b2.type !== "solid") break;
			lastSolid = cur;
			cur = cur.add(piston.facing);
		}
		if (lastSolid) {
			expect(engine.getBlock(lastSolid.add(piston.facing))).toBeUndefined();
		}
	}

	// Initial CLOSED at x=0
	expect(isDoorBlockAt(engine, 0)).toBe(true);
	expect(isDoorBlockAt(engine, 1)).toBe(false);

	// Toggle repeatedly; state remains valid and alternates across ON cycles
	const { pos: leverPos } = getLever(engine);
	let lastOpen = false;
	for (let i = 0; i < 12; i++) {
		engine.toggleLever(leverPos);
		engine.tick();
		engine.tick();
		const closed = isDoorBlockAt(engine, 0);
		const open = isDoorBlockAt(engine, 1);
		expect(closed !== open).toBe(true);
		if (open !== lastOpen) {
			lastOpen = open;
		}
	}
});
