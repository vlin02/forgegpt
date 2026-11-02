from __future__ import annotations
from typing import TYPE_CHECKING, TypedDict
from .position import Position, DOWN, UP, NEIGHBOR_OFFSETS, HORIZONTAL_OFFSETS
from .blocks import Block, Lever, Piston, RedstoneDust, OpaqueBlock

if TYPE_CHECKING:
    from collections.abc import Sequence


class PendingMove(TypedDict):
    from_pos: Position
    to_pos: Position


class SerializedPosition(TypedDict):
    x: int
    y: int
    z: int


class SerializedSolid(TypedDict):
    type: str
    pos: SerializedPosition
    power: int


class SerializedLever(TypedDict):
    type: str
    pos: SerializedPosition
    on: bool
    attachmentOffset: SerializedPosition


class SerializedDust(TypedDict):
    type: str
    pos: SerializedPosition
    power: int
    connectedDirs: list[str]


class SerializedPiston(TypedDict):
    type: str
    pos: SerializedPosition
    extended: bool
    faceAdjPowered: bool
    facing: SerializedPosition


SerializedBlock = SerializedSolid | SerializedLever | SerializedDust | SerializedPiston


class EngineSnapshot(TypedDict):
    tick: int
    blocks: list[SerializedBlock]


class Engine:
    def __init__(self):
        self.blocks: dict[str, Block] = {}
        self.positions: dict[id, Position] = {}
        self.current_tick = 0
        self.pending_moves: list[PendingMove] = []
        self.pending_clears: list[Position] = []

    def set_block(self, pos: Position, block: Block) -> bool:
        existing = self.get_block(pos)
        if existing:
            return False
        
        if block.type == "lever":
            attach_pos = pos.add(block.attachment_offset)
            attach_block = self.get_block(attach_pos)
            if not attach_block or attach_block.type != "solid":
                return False
        elif block.type == "dust":
            support_pos = pos.add(DOWN)
            support_block = self.get_block(support_pos)
            if not support_block or support_block.type != "solid":
                return False
        
        self.blocks[pos.to_key()] = block
        self.positions[id(block)] = pos
        return True

    def remove_block(self, block_or_pos: Block | Position) -> None:
        if isinstance(block_or_pos, Position):
            pos = block_or_pos
            block = self.blocks.get(pos.to_key())
            if block:
                del self.positions[id(block)]
            if pos.to_key() in self.blocks:
                del self.blocks[pos.to_key()]
        else:
            pos = self.positions.get(id(block_or_pos))
            if pos:
                del self.blocks[pos.to_key()]
                del self.positions[id(block_or_pos)]

    def get_block(self, pos: Position) -> Block | None:
        return self.blocks.get(pos.to_key())

    def find_block(self, block: Block) -> Position | None:
        return self.positions.get(id(block))

    def get_all_blocks(self) -> dict[str, Block]:
        return self.blocks

    def toggle_lever(self, block_or_pos: Block | Position) -> None:
        if isinstance(block_or_pos, Position):
            pos = block_or_pos
        else:
            pos = self.positions.get(id(block_or_pos))
        
        if not pos:
            return
        
        block = self.get_block(pos)
        if block and block.type == "lever":
            block.on = not block.on

    def tick(self) -> None:
        to_process = set(self.blocks.keys())
        piston_updates: set[str] = set()

        while to_process:
            current = list(to_process)
            to_process.clear()

            for key in current:
                block = self.blocks.get(key)
                if not block:
                    continue

                if block.type == "piston":
                    piston_updates.add(key)
                    continue

                pos = Position.from_key(key)

                if block.type == "lever":
                    attachment = self.get_block(pos.add(block.attachment_offset))
                    if not attachment or attachment.type != "solid":
                        self.remove_block(pos)
                    continue

                if block.type == "dust":
                    support = self.get_block(pos.add(DOWN))
                    if not support or support.type != "solid":
                        self.remove_block(pos)
                        continue
                    changed = self._evaluate_dust(block, pos)
                    if changed:
                        for offset in NEIGHBOR_OFFSETS:
                            neighbor_key = pos.add(offset).to_key()
                            if neighbor_key in self.blocks:
                                to_process.add(neighbor_key)
                elif block.type == "solid":
                    changed = self._evaluate_solid_block(block, pos)
                    if changed:
                        for offset in NEIGHBOR_OFFSETS:
                            neighbor_key = pos.add(offset).to_key()
                            if neighbor_key in self.blocks:
                                to_process.add(neighbor_key)

        for key in piston_updates:
            pos = Position.from_key(key)
            block = self.blocks.get(key)
            if block and block.type == "piston":
                self._evaluate_piston(block, pos)

        self._apply_pending_moves()
        self.current_tick += 1

    def _apply_pending_moves(self) -> None:
        for pos in self.pending_clears:
            self.remove_block(pos)
        self.pending_clears = []

        if not self.pending_moves:
            return
        
        blocks_to_move = [
            {**m, "block": self.blocks[m["from_pos"].to_key()]}
            for m in self.pending_moves
        ]
        
        for m in blocks_to_move:
            target = self.get_block(m["to_pos"])
            if target and (target.type == "dust" or target.type == "lever"):
                del self.blocks[m["to_pos"].to_key()]
        
        for m in blocks_to_move:
            del self.blocks[m["from_pos"].to_key()]
        
        for m in blocks_to_move:
            self.blocks[m["to_pos"].to_key()] = m["block"]
        
        blocks_to_check = list(self.blocks.items())
        for key, block in blocks_to_check:
            pos = Position.from_key(key)
            
            if block.type == "dust":
                support = self.get_block(pos.add(DOWN))
                if not support or support.type != "solid":
                    self.remove_block(pos)
            elif block.type == "lever":
                attachment = self.get_block(pos.add(block.attachment_offset))
                if not attachment or attachment.type != "solid":
                    self.remove_block(pos)
        
        self.pending_moves = []

    def _evaluate_piston(self, piston: Piston, pos: Position) -> bool:
        face_adj_powered = False
        
        for offset in NEIGHBOR_OFFSETS:
            if offset.y == 1 and piston.facing.y == 1 and not piston.extended:
                continue
            
            neighbor = self.get_block(pos.add(offset))
            if not neighbor:
                continue
            
            if neighbor.type == "dust":
                dir_to_piston = Position(-offset.x, 0, -offset.z).to_key()
                if dir_to_piston in neighbor.connected_dirs and neighbor.power > 0:
                    face_adj_powered = True
                    break
            elif self._get_block_power(neighbor) > 0:
                face_adj_powered = True
                break
        
        above = self.get_block(pos.add(UP))
        qc_powered = self._get_block_power(above) > 0 if above else False
        
        face_adj_changed = face_adj_powered != piston.face_adj_powered
        piston.face_adj_powered = face_adj_powered
        
        if not face_adj_changed:
            return False
        
        powered = face_adj_powered or qc_powered
        changed = piston.extended != powered
        
        if changed and powered:
            plan = self._attempt_push(piston, pos)
            if plan:
                self.pending_moves.extend(plan["moves"])
                self.pending_clears.extend(plan["clears"])
                piston.extended = True
            else:
                return False
        else:
            piston.extended = powered
        
        return changed

    def _attempt_push(self, piston: Piston, piston_pos: Position) -> dict[str, list] | None:
        moves: list[PendingMove] = []
        clears: list[Position] = []
        current_pos = piston_pos.add(piston.facing)
        solid_count = 0

        while True:
            block = self.get_block(current_pos)
            if not block:
                break
            if block.type == "piston":
                return None

            if block.type == "dust" or block.type == "lever":
                clears.append(current_pos)
                current_pos = current_pos.add(piston.facing)
                continue

            if block.type == "solid":
                solid_count += 1
                if solid_count > 12:
                    return None
                moves.append({"from_pos": current_pos, "to_pos": current_pos.add(piston.facing)})
                current_pos = current_pos.add(piston.facing)
                continue

            break

        sink = self.get_block(current_pos)
        if sink and (sink.type == "solid" or sink.type == "piston"):
            return None

        return {"moves": moves, "clears": clears}

    def _is_strongly_powered(self, pos: Position) -> bool:
        for offset in NEIGHBOR_OFFSETS:
            neighbor_pos = pos.add(offset)
            neighbor = self.get_block(neighbor_pos)
            if not neighbor:
                continue

            if neighbor.type == "lever" and neighbor.on:
                if (neighbor.attachment_offset.x == -offset.x and
                    neighbor.attachment_offset.y == -offset.y and
                    neighbor.attachment_offset.z == -offset.z):
                    return True
        return False

    def _evaluate_dust(self, dust: RedstoneDust, pos: Position) -> bool:
        max_power = 0
        connected_dirs: set[str] = set()

        support = self.get_block(pos.add(DOWN))
        if support and support.type == "solid" and self._is_strongly_powered(pos.add(DOWN)):
            max_power = max(max_power, support.power)

        for offset in HORIZONTAL_OFFSETS:
            neighbor_pos = pos.add(offset)
            neighbor = self.get_block(neighbor_pos)
            if not neighbor:
                continue

            if neighbor.type == "dust":
                max_power = max(max_power, neighbor.power - 1)
                connected_dirs.add(offset.to_key())
            elif neighbor.type == "lever" and neighbor.on:
                max_power = 15
            elif neighbor.type == "solid" and self._is_strongly_powered(neighbor_pos):
                max_power = max(max_power, neighbor.power)

        for vert_offset in [UP, DOWN]:
            for horiz_offset in HORIZONTAL_OFFSETS:
                diag_pos = pos.add(vert_offset, horiz_offset)
                diag_dust = self.get_block(diag_pos)
                
                if diag_dust and diag_dust.type == "dust":
                    my_support = self.get_block(pos.add(DOWN))
                    their_support = self.get_block(diag_pos.add(DOWN))
                    
                    if my_support and my_support.type == "solid" and their_support and their_support.type == "solid":
                        is_up = vert_offset.y == 1
                        lower = pos if is_up else diag_pos
                        upper = diag_pos if is_up else pos
                        lower_to_upper = horiz_offset if is_up else Position(-horiz_offset.x, 0, -horiz_offset.z)
                        
                        cell_h = lower.add(lower_to_upper)
                        cell_v = lower.add(UP)
                        block_h = self.get_block(cell_h)
                        block_v = self.get_block(cell_v)
                        
                        lower_support = lower.add(DOWN)
                        upper_support = upper.add(DOWN)
                        cut_h = block_h and block_h.type == "solid" and not cell_h.equals(lower_support) and not cell_h.equals(upper_support)
                        cut_v = block_v and block_v.type == "solid" and not cell_v.equals(lower_support) and not cell_v.equals(upper_support)
                        
                        if not cut_h and not cut_v:
                            max_power = max(max_power, diag_dust.power - 1)
                            connected_dirs.add(horiz_offset.to_key())

        power_changed = dust.power != max_power
        connections_changed = (len(dust.connected_dirs) != len(connected_dirs) or
                               not all(d in dust.connected_dirs for d in connected_dirs))
        
        dust.power = max_power
        dust.connected_dirs = connected_dirs
        return power_changed or connections_changed

    def _evaluate_solid_block(self, block: OpaqueBlock, pos: Position) -> bool:
        if self._is_strongly_powered(pos):
            changed = block.power != 15
            block.power = 15
            return changed

        max_weak_power = 0
        for offset in NEIGHBOR_OFFSETS:
            neighbor = self.get_block(pos.add(offset))
            if neighbor and neighbor.type == "dust":
                is_dot = len(neighbor.connected_dirs) == 0
                is_support = offset.y == 1
                if not is_dot or is_support:
                    max_weak_power = max(max_weak_power, neighbor.power)

        changed = block.power != max_weak_power
        block.power = max_weak_power
        return changed

    def _get_block_power(self, block: Block) -> int:
        if block.type == "lever":
            return 15 if block.on else 0
        if block.type == "dust":
            return block.power
        if block.type == "solid":
            return block.power
        return 0

    def get_tick(self) -> int:
        return self.current_tick

    def to_json(self) -> EngineSnapshot:
        blocks: list[SerializedBlock] = []
        for key, block in self.blocks.items():
            pos = Position.from_key(key)
            if block.type == "solid":
                blocks.append({
                    "type": "solid",
                    "pos": {"x": pos.x, "y": pos.y, "z": pos.z},
                    "power": block.power,
                })
            elif block.type == "lever":
                blocks.append({
                    "type": "lever",
                    "pos": {"x": pos.x, "y": pos.y, "z": pos.z},
                    "on": block.on,
                    "attachmentOffset": {
                        "x": block.attachment_offset.x,
                        "y": block.attachment_offset.y,
                        "z": block.attachment_offset.z
                    },
                })
            elif block.type == "dust":
                blocks.append({
                    "type": "dust",
                    "pos": {"x": pos.x, "y": pos.y, "z": pos.z},
                    "power": block.power,
                    "connectedDirs": list(block.connected_dirs),
                })
            elif block.type == "piston":
                blocks.append({
                    "type": "piston",
                    "pos": {"x": pos.x, "y": pos.y, "z": pos.z},
                    "extended": block.extended,
                    "faceAdjPowered": block.face_adj_powered,
                    "facing": {"x": block.facing.x, "y": block.facing.y, "z": block.facing.z},
                })
        return {"tick": self.current_tick, "blocks": blocks}

    @staticmethod
    def from_json(data: EngineSnapshot) -> Engine:
        sim = Engine()
        sim.load_json(data)
        return sim

    def load_json(self, data: EngineSnapshot) -> None:
        self.blocks.clear()
        self.positions = {}
        self.pending_moves = []
        self.pending_clears = []
        self.current_tick = data.get("tick", 0)

        for b in data.get("blocks", []):
            pos = Position(b["pos"]["x"], b["pos"]["y"], b["pos"]["z"])
            if b["type"] == "solid":
                block = OpaqueBlock()
                block.power = b.get("power", 0)
                self.set_block(pos, block)
            elif b["type"] == "lever":
                attach = Position(
                    b["attachmentOffset"]["x"],
                    b["attachmentOffset"]["y"],
                    b["attachmentOffset"]["z"]
                )
                block = Lever(attach)
                block.on = b.get("on", False)
                self.set_block(pos, block)
            elif b["type"] == "dust":
                block = RedstoneDust()
                block.power = b.get("power", 0)
                block.connected_dirs = set(b.get("connectedDirs", []))
                self.set_block(pos, block)
            elif b["type"] == "piston":
                facing = Position(
                    b["facing"]["x"],
                    b["facing"]["y"],
                    b["facing"]["z"]
                )
                block = Piston(facing)
                block.extended = b.get("extended", False)
                block.face_adj_powered = b.get("faceAdjPowered", False)
                self.set_block(pos, block)

    def inspect_block(self, block: Block) -> str:
        pos = self.find_block(block)
        pos_str = f"{pos.x}, {pos.y}, {pos.z}" if pos else "unknown"

        def dir_to_string(d: Position) -> str:
            if d.x == 1: return "east"
            if d.x == -1: return "west"
            if d.y == 1: return "up"
            if d.y == -1: return "down"
            if d.z == 1: return "south"
            if d.z == -1: return "north"
            return "unknown"

        if block.type == "solid":
            return f"Solid Block\nPosition: {pos_str}\nPower: {block.power}/15"
        elif block.type == "lever":
            attach_dir = dir_to_string(block.attachment_offset)
            return f"Lever\nPosition: {pos_str}\nState: {'ON' if block.on else 'off'}\nAttached to: {attach_dir}"
        elif block.type == "dust":
            dirs = ", ".join([
                "east" if d.split(",")[0] == "1" else
                "west" if d.split(",")[0] == "-1" else
                "south" if d.split(",")[2] == "1" else
                "north" if d.split(",")[2] == "-1" else "?"
                for d in block.connected_dirs
            ])
            return f"Redstone Dust\nPosition: {pos_str}\nPower: {block.power}/15\nShape: {dirs or 'dot'}"
        elif block.type == "piston":
            face_dir = dir_to_string(block.facing)
            return f"Piston\nPosition: {pos_str}\nState: {'EXTENDED' if block.extended else 'retracted'}\nFacing: {face_dir}"
        return ""


RedstoneSimulator = Engine


