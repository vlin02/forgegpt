"""
Basic example: Lever powering redstone dust
"""
from block_py import Engine, Position, OpaqueBlock, Lever, RedstoneDust, DOWN

# Helper function
def at(x: int, y: int, z: int) -> Position:
    return Position(x, y, z)

# Create engine
sim = Engine()

# Build contraption: Lever on block powering dust on adjacent block
sim.set_block(at(0, 0, 0), OpaqueBlock())
sim.set_block(at(1, 0, 0), OpaqueBlock())
lever = Lever(DOWN)
sim.set_block(at(0, 1, 0), lever)
dust = RedstoneDust()
sim.set_block(at(1, 1, 0), dust)

print("Initial state:")
print(f"  Lever: {'ON' if lever.on else 'OFF'}")
print(f"  Dust power: {dust.power}")

# Toggle lever and tick
sim.toggle_lever(at(0, 1, 0))
sim.tick()

print("\nAfter lever toggle and tick:")
print(f"  Lever: {'ON' if lever.on else 'OFF'}")
print(f"  Dust power: {dust.power}")

# Inspect blocks
print("\nBlock inspection:")
print(sim.inspect_block(lever))
print()
print(sim.inspect_block(dust))


