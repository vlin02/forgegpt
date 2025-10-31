Redstone Core v1.2 — Normative Specification

1. Scope

Defines a deterministic tick-based model for the interaction: Lever → RedstoneDust → Piston on OpaqueBlocks.

Covers: game ticks, stateless propagation, mechanical scheduling, power propagation.

Out-of-scope: repeaters, comparators, torches, observers, sticky pistons, vertical dust, quasi-connectivity, block pushing.

2. Tick Model

Game ticks proceed discretely: t = 0, 1, 2, …

Each tick t has two phases:

Intra-tick closure: all stateless components (Lever, RedstoneDust, OpaqueBlock) react to input changes and recompute outputs immediately, repeated until no further changes (a fixpoint).

Block events: mechanical components (Pistons) do not act during intra-tick closure. When a power state change is detected, the mechanical action executes in the same tick after intra-tick closure completes.

3. Power Model

Power level: integer in [0, 15].

Strong power: direct emission from a powered component.

Weak power: indirect emission from a powered opaque block or from RedstoneDust.

Propagation: a block's input power = max of output powers of all face-adjacent neighbors.

4. Component Rules

4.1 OpaqueBlock

Supports lever attachments and dust placement on top.

If the block receives strong power from any face-adjacent neighbor, it emits weak power level 15 to all face-adjacent positions.

Otherwise it emits power level 0 to all face-adjacent positions.

4.2 Lever

Binary state: ON or OFF.

Must attach to an OpaqueBlock.

When toggled, new state is effective immediately in the intra-tick closure.

If ON: emits strong power level 15 to its attachment block; emits weak power level 15 to all other face-adjacent positions.

If OFF: emits power level 0 to all face-adjacent positions.

4.3 RedstoneDust

Placed on top of an OpaqueBlock.

Connects to four horizontal neighbors (±X, ±Z).

If its support block is removed or a solid block occupies its position, the dust is removed immediately during intra-tick closure.

During intra-tick closure, dust power level is computed as:

  max(adjacent strong-power sources, max(adjacent dust power − 1, 0))

Dust emits its power level as weak power to horizontally adjacent positions.

4.4 Piston

Two states: Extended or Retracted.

Considered powered if any face-adjacent position emits power level > 0.

On power gain (previously unpowered → powered): extend after intra-tick closure completes.

On power loss (previously powered → unpowered): retract after intra-tick closure completes.

Piston does not emit power.

5. Conformance Requirements

A Lever toggled ON causes its attachment block and adjacent components to observe the power emission within the same tick's intra-tick closure.

Dust power decays by 1 per horizontal hop, never by time.

Dust breaks immediately if unsupported or obstructed.

A Piston extends or retracts in the same tick as its power transition, after intra-tick closure completes.

Power transmission occurs only between face-adjacent blocks.
