from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterable


class Position:
    def __init__(self, x: int, y: int, z: int):
        self.x = x
        self.y = y
        self.z = z

    def add(self, *positions: Position) -> Position:
        result_x, result_y, result_z = self.x, self.y, self.z
        for pos in positions:
            result_x += pos.x
            result_y += pos.y
            result_z += pos.z
        return Position(result_x, result_y, result_z)

    def mul(self, scalar: int) -> Position:
        return Position(self.x * scalar, self.y * scalar, self.z * scalar)

    def copy(self) -> Position:
        return Position(self.x, self.y, self.z)

    def to_key(self) -> str:
        return f"{self.x},{self.y},{self.z}"

    def equals(self, other: Position) -> bool:
        return self.x == other.x and self.y == other.y and self.z == other.z

    @staticmethod
    def from_key(key: str) -> Position:
        x, y, z = map(int, key.split(","))
        return Position(x, y, z)


NORTH = Position(0, 0, -1)
SOUTH = Position(0, 0, 1)
EAST = Position(1, 0, 0)
WEST = Position(-1, 0, 0)
UP = Position(0, 1, 0)
DOWN = Position(0, -1, 0)

HORIZONTAL_OFFSETS: list[Position] = [NORTH, SOUTH, EAST, WEST]
NEIGHBOR_OFFSETS: list[Position] = [NORTH, SOUTH, EAST, WEST, UP, DOWN]


