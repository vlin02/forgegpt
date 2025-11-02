# Scoped Block Mechanics — Normative Specification (v1)

## 1. Scope
This specification defines deterministic mechanical interactions for four block types: **Lever**, **RedstoneDust**, **OpaqueBlock**, and **Piston**. World model: infinite 3D space; all blocks are active every tick.

## 2. Tick Model
- **Discrete time:** ticks t = 0, 1, 2, …
- **Phase 1 (closure):** Lever, RedstoneDust, and OpaqueBlock are reevaluated repeatedly until no block state changes occur; evaluation order does not affect the final state (**unique fixpoint**).
- **Phase 2 (mechanics):** Pistons update once. All block movements apply **atomically at the end of Phase 2**. The new configuration is first evaluated in the next tick’s Phase 1.

## 3. Power Model
- **Power level:** integer in [0, 15].
- **Strong power:** An OpaqueBlock is **strongly powered** iff a Lever on one of its faces is ON. A strongly powered OpaqueBlock emits **weak power 15** to all six faces. Strong power does not create strong power in neighbors. :contentReference[oaicite:0]{index=0}
- **Weak power only:** An OpaqueBlock receiving power only from RedstoneDust is **weakly powered** and **emits 0**; it cannot power adjacent RedstoneDust.

## 4. Block Types

### 4.1 OpaqueBlock
- Occupies one block space; supports Lever attachment on any face and RedstoneDust placement on its top face.
- Power state is computed in Phase 1 per §3.

### 4.2 Lever
- **State:** ON/OFF. Must attach to a face of an OpaqueBlock.
- **Removal:** If its attachment block is removed or moved: remove the Lever. Timing: Phase 1 on removal; end of Phase 2 if moved by a piston.
- **Emission:** ON ⇒ power 15 to its attachment face (strongly powers that OpaqueBlock) and power 15 to all other face-adjacent positions. OFF ⇒ power 0 to all face-adjacent positions.

### 4.3 RedstoneDust
- **Placement & removal:** Must be on the **top face** of an OpaqueBlock. If the support is removed, moved, or a solid block occupies the dust’s **own** position, remove the dust during Phase 1 (no power after removal).
- **Block above:** Placing any block in the cell **above** a dust piece **does not remove** the dust. If that above block is **opaque**, it **prevents** the dust from forming or maintaining **±1 Y step connections**; horizontal connections and emission are unchanged. :contentReference[oaicite:1]{index=1}
- **Connectivity:** Dust connects to dust at ±X/±Z on the same Y. It also connects across a **±1 Y diagonal step** under **Vertical ±1 Step Connectivity** (below). :contentReference[oaicite:2]{index=2}
- **Level:** During Phase 1, dust level = max( (a) power from adjacent Lever or **strongly powered** OpaqueBlock, (b) connected dust level − 1, (c) 0 ).
- **Emission:** Each dust piece emits its level as **weak power** to exactly **five** positions: its **support OpaqueBlock (down)** and the **four horizontal neighbors** (±X, ±Z on same Y).
- **Shape and mechanism activation:** An **isolated** dust piece can be toggled between **cross** and **dot**. A **dot powers only its support block** and **does not power adjacent sides**. A piston treats adjacent dust as an activator **only if** the dust points into the piston’s cell; a 4-way cross qualifies, a dot does not. :contentReference[oaicite:3]{index=3}
- **Vertical ±1 Step Connectivity (axiomatic):** Let **lower** be the lower dust and **upper = lower + UP + horiz**, where **horiz ∈ {±X, ±Z}**. A step connection **exists iff** (a) both dust pieces sit on **OpaqueBlocks** and (b) both **edge-sharing cells** are **non-solid**: **lower + UP** and **lower + horiz**. If **either** edge-sharing cell is solid, the step is **cut**. Symmetric for downward steps by exchanging **UP ↔ DOWN** and swapping **lower/upper**. :contentReference[oaicite:4]{index=4}

### 4.4 Piston
- **State:** Extended/Retracted. Has a facing direction. Does **not** emit power.
- **Power sources (all apply):**
  1) **Adjacent powered block:** A piston is activated by **any directly adjacent powered block** (strongly **or weakly** powered), even if that block **emits 0** to others. :contentReference[oaicite:5]{index=5}  
  2) **Adjacent dust (shape-gated):** Adjacent powered RedstoneDust activates the piston **only if** the dust’s shape **points into** the piston’s cell (cross qualifies; dot does not). :contentReference[oaicite:6]{index=6}  
  3) **Quasi-connectivity (QC):** The **space directly above the piston base** is an additional power input; the piston **does not change state from QC** until it receives a **block update**. :contentReference[oaicite:7]{index=7}  
  4) **Up-facing exception:** An **upward-facing** piston **cannot** be powered by the block **above** it **unless already extended**. :contentReference[oaicite:8]{index=8}
- **Transitions (Phase 2):**
  - **Power gain:** Attempt to extend by pushing up to **12 contiguous blocks** along the facing direction. If any non-movable is encountered or the count exceeds 12, **do not extend** (no movement). :contentReference[oaicite:9]{index=9}
  - **Power loss:** Retract. A (non-sticky) piston **never pulls** blocks on retraction. :contentReference[oaicite:10]{index=10}
- **Movability (within this scope):**  
  **OpaqueBlock:** movable. **RedstoneDust:** breaks if its support moves. **Lever:** breaks if its attachment block moves. **Piston (any):** non-movable (obstacle; causes push failure).
- **Push semantics (full blocks vs. face-components):**
  - **Push line membership:** Only **OpaqueBlock** instances count toward the “contiguous blocks to push.” **Lever** and **RedstoneDust** do **not** count toward contiguity and do **not** block a push. If a moving block or piston head would occupy a cell containing Lever or RedstoneDust, those components are **destroyed at motion apply** (drop as items). :contentReference[oaicite:11]{index=11}
  - **Sink requirement:** Extension **succeeds only if** the cell immediately beyond the push line (along the facing direction) is **empty of full blocks** at execution time; otherwise the piston **does not extend** (no movement). Face-components in the sink cell are ignored and are destroyed on overlap per the previous bullet. :contentReference[oaicite:12]{index=12}
  - **Immovable obstacles:** If the push line or sink includes any immovable (Piston base/head or Moving Piston), the extension is **illegal** and the piston **does not extend**. :contentReference[oaicite:13]{index=13}
  - **Moving-piston obstruction (same tick):** During an extension, cells occupied by the **moving piston** act as **solid obstacles** for any other piston actions processed later in the same tick. :contentReference[oaicite:14]{index=14}

