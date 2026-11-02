# Block

Redstone Core v1 simulator

## Installation

```bash
uv pip install -e .
```

## Development

Install with dev dependencies:

```bash
uv pip install -e ".[dev]"
```

Run tests:

```bash
uv run pytest
```

## Usage

```python
from block_py import Engine, Position, OpaqueBlock, Lever, RedstoneDust, Piston, DOWN, EAST

# Create engine
sim = Engine()

# Build a contraption
sim.set_block(Position(0, 0, 0), OpaqueBlock())
sim.set_block(Position(0, 1, 0), Lever(DOWN))
sim.set_block(Position(1, 0, 0), OpaqueBlock())
sim.set_block(Position(1, 1, 0), RedstoneDust())

# Toggle lever
lever_pos = Position(0, 1, 0)
sim.toggle_lever(lever_pos)

# Tick the simulation
sim.tick()

# Check state
dust = sim.get_block(Position(1, 1, 0))
print(f"Dust power: {dust.power}")
```

## Block Legend

- `#` / `#15` - Solid block (power level)
- `L-` / `L+` - Lever (off/on)
- `~0` / `~15` - Redstone dust (power level)
- `P|` / `P>` - Piston (retracted/extended)
- `.` - Empty space

## Specification

See `spec.md` for the complete normative specification of the redstone mechanics.


