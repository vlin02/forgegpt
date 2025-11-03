import { describe, test, expect } from "vitest";
import { Engine, Builder, Position, NORTH, SOUTH, EAST, WEST, UP, DOWN } from "block";
import type { Block } from "block";
import { Lever, Piston, RedstoneDust, OpaqueBlock } from "block";
import { build } from "./index.js";

function getAll(engine: Engine) {
	const blocks: { pos: Position; block: Block }[] = [];
	for (const [key, block] of engine.getAllBlocks()) {
		blocks.push({ pos: Position.fromKey(key), block });
	}
	return blocks;
}

function neighbors(pos: Position): Position[] {
	return [NORTH, SOUTH, EAST, WEST, UP, DOWN].map(o => pos.add(o));
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

function bankExtended(bank: { pos: Position; piston: Piston }[]): boolean {
	return bank.some(p => p.piston.extended);
}

function bankHasPoweredFaceSolids(engine: Engine, bank: { pos: Position; piston: Piston }[]): boolean {
	return bank.every(({ pos, piston }) => {
		const face = pos.add(piston.facing);
		const b = engine.getBlock(face);
		return b?.type === "solid" && (b as OpaqueBlock).power > 0;
	});
}

test("Single-Lever 2×2 Flush Translator Door - spec", () => {
	const engine = new Engine();
	const b = new Builder(engine);
	build(engine);

	// 1) I/O
	const leverCount = getAll(engine).filter(x => x.block.type === "lever").length;
	expect(leverCount).toBe(1);
	const { openBank, closeBank } = getBanks(engine);
	expect(openBank.length).toBeGreaterThanOrEqual(2);
	expect(closeBank.length).toBeGreaterThanOrEqual(2);

	// 2) Motion topology + 7) push constraints
	expect(maxPushLine(engine, openBank)).toBeLessThanOrEqual(12);
	expect(maxPushLine(engine, closeBank)).toBeLessThanOrEqual(12);

	// Sink beyond push line free (no full blocks directly ahead of furthest block)
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

	// Initial CLOSED state: doorway filled at x=0
	expect(isDoorBlockAt(engine, 0)).toBe(true);
	expect(isDoorBlockAt(engine, 1)).toBe(false);

	// Router gating proxy: in CLOSED, only OPEN bank face-adjacent solids should be powered
	expect(bankHasPoweredFaceSolids(engine, openBank)).toBe(true);
	expect(bankHasPoweredFaceSolids(engine, closeBank)).toBe(false);

	// 9) Toggle repeatedly and verify alternation and exclusivity
	const { lever } = getLever(engine);
	for (let i = 0; i < 12; i++) {
		b.toggle(lever).run(2);
		const closed = isDoorBlockAt(engine, 0);
		const open = isDoorBlockAt(engine, 1);
		expect(closed !== open).toBe(true);
		const banks = getBanks(engine);
		const openExt = bankExtended(banks.openBank);
		const closeExt = bankExtended(banks.closeBank);
		expect(openExt !== closeExt).toBe(true);
		// Router polarity proxy via powered face solids
		expect(bankHasPoweredFaceSolids(engine, banks.openBank) !== bankHasPoweredFaceSolids(engine, banks.closeBank)).toBe(true);
	}
});
