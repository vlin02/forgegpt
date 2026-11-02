"""
Example: Piston pushing a block
"""
from block_py import Engine, Position, OpaqueBlock, Lever, Piston, DOWN, EAST

# Helper function
def at(x: int, y: int, z: int) -> Position:
    return Position(x, y, z)

# Create engine
sim = Engine()

# Build contraption: Lever powers piston to push block
sim.set_block(at(0, 0, 0), OpaqueBlock())
piston = Piston(EAST)
sim.set_block(at(0, 1, 0), piston)
sim.set_block(at(0, 2, 0), OpaqueBlock())
lever = Lever(DOWN)
sim.set_block(at(0, 3, 0), lever)

# Block to be pushed
block_to_push = OpaqueBlock()
sim.set_block(at(1, 1, 0), block_to_push)

print("Initial state:")
print(f"  Piston extended: {piston.extended}")
print(f"  Block at (1,1,0): {sim.get_block(at(1, 1, 0)) is not None}")
print(f"  Block at (2,1,0): {sim.get_block(at(2, 1, 0)) is not None}")

# Power the piston
sim.toggle_lever(at(0, 3, 0))
sim.tick()

print("\nAfter powering piston:")
print(f"  Piston extended: {piston.extended}")
print(f"  Block at (1,1,0): {sim.get_block(at(1, 1, 0)) is not None}")
print(f"  Block at (2,1,0): {sim.get_block(at(2, 1, 0)) is not None}")
print(f"  Block at (2,1,0) is the same block: {sim.get_block(at(2, 1, 0)) is block_to_push}")


