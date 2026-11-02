import pytest
from block_py import (
    Position,
    DOWN as D,
    EAST as E,
    WEST as W,
    NORTH as N,
    SOUTH as S,
    UP as U,
    OpaqueBlock,
    RedstoneDust,
    Piston,
    Lever,
    Engine,
)


def at(x: int, y: int, z: int) -> Position:
    return Position(x, y, z)


def test_core_spec_features():
    sim = Engine()

    base0 = OpaqueBlock()
    sim.set_block(at(0, 0, 0), base0)
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 1), OpaqueBlock())
    base_weak = OpaqueBlock()
    sim.set_block(at(2, 1, 1), base_weak)
    sim.set_block(at(3, 0, 1), OpaqueBlock())
    sim.set_block(at(4, 0, 0), OpaqueBlock())
    block_to_push = OpaqueBlock()
    sim.set_block(at(5, 1, 1), block_to_push)
    sim.set_block(at(5, 0, 0), OpaqueBlock())
    sim.set_block(at(0, 0, 1), OpaqueBlock())
    sim.set_block(at(1, 1, 2), OpaqueBlock())
    sim.set_block(at(0, 1, 0), Lever(D))
    dust1 = RedstoneDust()
    sim.set_block(at(1, 1, 0), dust1)
    dust2 = RedstoneDust()
    sim.set_block(at(1, 1, 1), dust2)
    dust_isolated = RedstoneDust()
    sim.set_block(at(3, 1, 1), dust_isolated)
    sim.set_block(at(5, 1, 0), RedstoneDust())
    sim.set_block(at(5, 2, 1), RedstoneDust())
    dust_vert_lower = RedstoneDust()
    sim.set_block(at(0, 1, 1), dust_vert_lower)
    dust_vert_upper = RedstoneDust()
    sim.set_block(at(1, 2, 2), dust_vert_upper)
    sim.set_block(at(4, 1, 0), Lever(D))
    piston = Piston(E)
    sim.set_block(at(4, 1, 1), piston)

    assert piston.extended == False

    sim.toggle_lever(at(0, 1, 0))
    sim.toggle_lever(at(4, 1, 0))
    sim.tick()

    assert base0.power == 15
    assert dust1.power == 15
    assert dust2.power == 14
    assert base_weak.power == 14
    assert dust_isolated.power == 0
    assert dust_vert_lower.power == 15
    assert dust_vert_upper.power == 13
    assert piston.extended == True
    assert sim.get_block(at(6, 1, 1)) == block_to_push
    assert sim.get_block(at(5, 2, 1)) is None

    sim.toggle_lever(at(4, 1, 0))
    sim.remove_block(at(1, 0, 0))
    sim.tick()

    assert sim.get_block(at(1, 1, 0)) is None
    assert piston.extended == False

    sim.remove_block(at(0, 0, 0))
    sim.tick()

    assert sim.get_block(at(0, 1, 0)) is None


def test_piston_failures_and_multi_block_push():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    piston_no_sink = Piston(E)
    sim.set_block(at(0, 1, 0), piston_no_sink)
    sim.set_block(at(1, 1, 0), OpaqueBlock())
    sim.set_block(at(0, 1, 0), Lever(D))

    sim.set_block(at(2, 0, 0), OpaqueBlock())
    piston_immovable = Piston(E)
    sim.set_block(at(2, 1, 0), piston_immovable)
    sim.set_block(at(3, 1, 0), Piston(W))
    sim.set_block(at(2, 1, 0), Lever(D))

    sim.set_block(at(4, 0, 0), OpaqueBlock())
    piston_too_many = Piston(E)
    sim.set_block(at(4, 1, 0), piston_too_many)
    for i in range(13):
        sim.set_block(at(5 + i, 1, 0), OpaqueBlock())
    sim.set_block(at(4, 1, 0), Lever(D))

    sim.set_block(at(0, 0, 2), OpaqueBlock())
    piston_multi = Piston(E)
    sim.set_block(at(0, 1, 2), piston_multi)
    sim.set_block(at(1, 1, 2), OpaqueBlock())
    sim.set_block(at(2, 1, 2), Lever(W))
    sim.set_block(at(3, 1, 2), OpaqueBlock())
    block3 = OpaqueBlock()
    sim.set_block(at(4, 1, 2), block3)
    sim.set_block(at(4, 2, 2), Lever(W))

    sim.toggle_lever(at(0, 1, 0))
    sim.toggle_lever(at(2, 1, 0))
    sim.toggle_lever(at(4, 1, 0))
    sim.toggle_lever(at(2, 1, 2))
    sim.tick()

    assert piston_no_sink.extended == False
    assert piston_immovable.extended == False
    assert piston_too_many.extended == False
    assert piston_multi.extended == True
    assert isinstance(sim.get_block(at(2, 1, 2)), OpaqueBlock)
    assert sim.get_block(at(5, 1, 2)) == block3
    assert sim.get_block(at(4, 2, 2)) is None


def test_weakly_powered_block_activates_piston():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 1), OpaqueBlock())
    sim.set_block(at(0, 1, 0), Lever(D))
    sim.set_block(at(1, 1, 0), RedstoneDust())
    sim.set_block(at(1, 1, 1), RedstoneDust())
    weak_block = OpaqueBlock()
    sim.set_block(at(2, 1, 1), weak_block)
    piston_weak = Piston(W)
    sim.set_block(at(3, 1, 1), piston_weak)

    sim.toggle_lever(at(0, 1, 0))
    sim.tick()

    assert weak_block.power > 0
    assert piston_weak.extended == True


def test_dust_shape_dot_does_not_activate_adjacent_piston():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    dust_dot = RedstoneDust()
    sim.set_block(at(0, 1, 0), dust_dot)
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    piston_dot = Piston(W)
    sim.set_block(at(1, 1, 0), piston_dot)
    sim.set_block(at(0, 0, 0), Lever(D))

    sim.toggle_lever(at(0, 0, 0))
    sim.tick()

    assert len(dust_dot.connected_dirs) == 0
    assert piston_dot.extended == False


def test_dust_shape_cross_activates_adjacent_piston():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    sim.set_block(at(2, 0, 0), OpaqueBlock())
    sim.set_block(at(2, 1, 0), RedstoneDust())
    dust_cross = RedstoneDust()
    sim.set_block(at(1, 1, 0), dust_cross)
    sim.set_block(at(3, 1, 0), OpaqueBlock())
    piston_cross = Piston(W)
    sim.set_block(at(3, 2, 0), piston_cross)
    sim.set_block(at(0, 1, 0), Lever(D))

    sim.toggle_lever(at(0, 1, 0))
    sim.tick()

    assert len(dust_cross.connected_dirs) > 0
    assert piston_cross.extended == True


def test_qc_requires_block_update():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    piston_qc = Piston(E)
    sim.set_block(at(0, 1, 0), piston_qc)
    sim.set_block(at(0, 2, 0), OpaqueBlock())
    sim.set_block(at(0, 3, 0), Lever(D))

    sim.toggle_lever(at(0, 3, 0))
    sim.tick()

    assert piston_qc.extended == True

    sim.set_block(at(1, 1, 0), OpaqueBlock())
    sim.tick()

    assert piston_qc.extended == True


def test_up_facing_piston_exception():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    piston_up = Piston(U)
    sim.set_block(at(0, 1, 0), piston_up)
    sim.set_block(at(0, 2, 0), OpaqueBlock())
    sim.set_block(at(0, 3, 0), Lever(D))

    sim.toggle_lever(at(0, 3, 0))
    sim.tick()

    assert piston_up.extended == False


def test_opaque_block_above_prevents_vertical_step_connection():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    dust_lower = RedstoneDust()
    sim.set_block(at(0, 1, 0), dust_lower)
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    dust_upper = RedstoneDust()
    sim.set_block(at(1, 2, 0), dust_upper)
    sim.set_block(at(0, 2, 0), OpaqueBlock())
    sim.set_block(at(-1, 0, 0), OpaqueBlock())
    sim.set_block(at(-1, 1, 0), Lever(D))

    sim.toggle_lever(at(-1, 1, 0))
    sim.tick()

    assert dust_lower.power == 15
    assert dust_upper.power == 0


def test_solid_block_cuts_vertical_step_connection():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    sim.set_block(at(2, 0, 0), OpaqueBlock())
    dust_lower = RedstoneDust()
    sim.set_block(at(0, 1, 0), dust_lower)
    dust_mid = RedstoneDust()
    sim.set_block(at(1, 1, 0), dust_mid)
    dust_upper = RedstoneDust()
    sim.set_block(at(2, 2, 0), dust_upper)
    sim.set_block(at(-1, 0, 0), OpaqueBlock())
    sim.set_block(at(-1, 1, 0), Lever(D))

    sim.toggle_lever(at(-1, 1, 0))
    sim.tick()

    assert dust_lower.power == 15
    assert dust_mid.power == 14
    assert dust_upper.power == 0


def test_weak_only_powered_block_cannot_power_adjacent_dust():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    weak_block = OpaqueBlock()
    sim.set_block(at(2, 0, 0), weak_block)
    sim.set_block(at(3, 0, 0), OpaqueBlock())
    sim.set_block(at(0, 1, 0), Lever(D))
    sim.set_block(at(1, 1, 0), RedstoneDust())
    sim.set_block(at(2, 1, 0), RedstoneDust())
    adjacent_dust = RedstoneDust()
    sim.set_block(at(2, 0, 1), adjacent_dust)

    sim.toggle_lever(at(0, 1, 0))
    sim.tick()

    assert weak_block.power > 0
    assert adjacent_dust.power == 0


def test_lever_dust_destruction_and_12_block_limit_bypass():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    piston = Piston(E)
    sim.set_block(at(0, 1, 0), piston)
    sim.set_block(at(1, 0, 0), OpaqueBlock())
    sim.set_block(at(1, 1, 0), RedstoneDust())
    block1 = OpaqueBlock()
    sim.set_block(at(2, 1, 0), block1)
    sim.set_block(at(3, 1, 0), Lever(W))
    block2 = OpaqueBlock()
    sim.set_block(at(4, 1, 0), block2)
    sim.set_block(at(-1, 1, 0), OpaqueBlock())
    sim.set_block(at(-1, 1, 1), Lever(N))

    sim.toggle_lever(at(-1, 1, 1))
    sim.tick()

    assert piston.extended == True
    assert sim.get_block(at(1, 1, 0)) is None
    assert sim.get_block(at(2, 1, 0)) is None
    assert sim.get_block(at(3, 1, 0)) == block1
    assert sim.get_block(at(5, 1, 0)) == block2


def test_block_above_dust_does_not_remove_dust():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    dust = RedstoneDust()
    sim.set_block(at(0, 1, 0), dust)

    sim.set_block(at(0, 2, 0), OpaqueBlock())
    sim.tick()

    assert sim.get_block(at(0, 1, 0)) == dust


def test_piston_retraction():
    sim = Engine()

    sim.set_block(at(0, 0, 0), OpaqueBlock())
    piston = Piston(E)
    sim.set_block(at(0, 1, 0), piston)
    sim.set_block(at(1, 1, 0), OpaqueBlock())
    sim.set_block(at(0, 2, 0), OpaqueBlock())
    sim.set_block(at(0, 3, 0), Lever(D))

    sim.toggle_lever(at(0, 3, 0))
    sim.tick()

    assert piston.extended == True
    assert isinstance(sim.get_block(at(2, 1, 0)), OpaqueBlock)

    sim.toggle_lever(at(0, 3, 0))
    sim.tick()

    assert piston.extended == False
    assert isinstance(sim.get_block(at(2, 1, 0)), OpaqueBlock)


def test_placement_validation():
    sim = Engine()

    assert sim.set_block(at(0, 0, 0), RedstoneDust()) == False
    sim.set_block(at(0, -1, 0), OpaqueBlock())
    assert sim.set_block(at(0, 0, 0), RedstoneDust()) == True

    assert sim.set_block(at(1, 0, 0), Lever(D)) == False
    sim.set_block(at(1, -1, 0), OpaqueBlock())
    assert sim.set_block(at(1, 0, 0), Lever(D)) == True

    piston = Piston(U)
    sim.set_block(at(2, 0, 0), piston)
    assert sim.set_block(at(2, 1, 0), RedstoneDust()) == False

    assert sim.set_block(at(3, 1, 0), Lever(Position(0, -1, 0))) == False


