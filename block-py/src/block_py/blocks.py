from __future__ import annotations
from typing import Literal
from .position import Position


BlockType = Literal["solid", "lever", "dust", "piston"]


class Lever:
    type: Literal["lever"] = "lever"
    
    def __init__(self, attachment_offset: Position):
        self.on = False
        self.attachment_offset = attachment_offset


class Piston:
    type: Literal["piston"] = "piston"
    
    def __init__(self, facing: Position):
        self.extended = False
        self.facing = facing
        self.face_adj_powered = False


class RedstoneDust:
    type: Literal["dust"] = "dust"
    
    def __init__(self):
        self.power = 0
        self.connected_dirs: set[str] = set()


class OpaqueBlock:
    type: Literal["solid"] = "solid"
    
    def __init__(self):
        self.power = 0


Block = Lever | Piston | RedstoneDust | OpaqueBlock


