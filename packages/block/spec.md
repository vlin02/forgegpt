# Redstone Core v1 — Minimal Normative RFC (Implementation‑Independent)

## 0. Scope

Defines deterministic behavior for **Lever → RedstoneDust → Piston** connected on **GenericSolidBlock** support. Applies to any simulation engine. Contains only rules required for correct power propagation and tick timing.

## 1. Core Concepts

- **Block:** occupies one grid cell; interacts via six faces.
- **Faces:** {North, South, East, West, Up, Down}. Adjacent blocks share a face.
- **Game Tick (GT):** discrete step, 20 GT per second.
- **Power Level:** integer 0–15 (0 = unpowered, 15 = max).
- **Strong Power:** direct emission (lever → attached block).
- **Weak Power:** indirect emission (dust → opaque block).

## 2. Tick Model

1. Global scheduler tracks an **update set** of positions.
2. **Emit (GT t):** placements, removals, or state changes enqueue their position and six neighbors for evaluation in GT t+1.
3. **Evaluate (GT t):** all positions in the update set recompute simultaneously using only committed states from GT t−1.
4. **Commit (end of GT t):** new states become active. Changed blocks enqueue updates for GT t+1.
5. No ordering within a GT. Results appear next tick.

## 3. Power Propagation

- A block’s **outgoing power per face** depends on its state.
- A block’s **incoming power** on a face equals the maximum outgoing power from its adjacent neighbor on that face.
- For multiple inputs, take the **maximum** value.

## 4. Block Definitions

### 4.1 GenericSolidBlock

- Opaque support block.
- Accepts **strong power 15** from any attached Lever.
- Accepts **weak power p** from adjacent dust (p>0).
- When strongly powered, emits **15 on all faces** at the next evaluation.

### 4.2 Lever

- Binary state: on/off.
- Must attach to a GenericSolidBlock.
- When toggled at GT t:
  - At GT t+1, strongly powers its attachment block at 15.
  - Emits 15 on its output face (opposite the attached face).

- When off, emits 0.

### 4.3 RedstoneDust

- Exists on top of an opaque block.
- Interacts only with four horizontal neighbors (±x, ±z).
- Removed at GT t+1 if its support block is removed.
- During evaluation:
  1. If any horizontal neighbor is a strongly powered block, input = 15.
  2. From each dust neighbor with power q, input = q−1 (not <0).
  3. Desired power = max(all inputs).
  4. If desired ≠ current, update and enqueue neighbors for next GT.

### 4.4 Piston

- Binary state: extended/retracted; has a facing.
- Powered if any adjacent face receives power >0.
- On unpowered→powered transition: extend at GT+1.
- On powered→unpowered transition: retract at GT+1.
- Does not emit power; no pushing or stickiness.

## 5. Conformance

- **C1:** Lever on → attachment block emits 15 next tick.
- **C2:** Dust line decays [15,14,13,…].
- **C3:** Dust removed one tick after support removal.
- **C4:** Piston extends/retracts one tick after power transition.
- **C5:** Only face‑adjacent power counts (no quasi‑connectivity).

## 6. Out of Scope

Repeaters, comparators, torches, observers, sticky pistons, block pushing, and vertical dust links.
