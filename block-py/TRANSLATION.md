# TypeScript to Python Translation

This document outlines the translation from the TypeScript block library to Python.

## File Mapping

| TypeScript | Python | Notes |
|------------|--------|-------|
| `src/position.ts` | `src/block_py/position.py` | Direct translation |
| `src/blocks.ts` | `src/block_py/blocks.py` | Using Python type hints and dataclasses-like approach |
| `src/engine.ts` | `src/block_py/engine.py` | Direct translation with Python idioms |
| `src/index.ts` | `src/block_py/__init__.py` | Python package exports |
| `src/test.spec.ts` | `tests/test_spec.py` | Vitest → pytest |
| `package.json` | `pyproject.toml` | npm → uv |
| `spec.md` | `spec.md` | Copied as-is |
| `README.md` | `README.md` | Updated for Python |

## Key Translations

### TypeScript → Python

- `class` with `readonly type` → classes with type annotations
- `Map<string, Block>` → `dict[str, Block]`
- `WeakMap<Block, Position>` → `dict[id, Position]` (using `id()` for object identity)
- `Set<string>` → `set[str]`
- `Array` → `list`
- `.toKey()` → `.to_key()` (snake_case)
- `instanceof` → `type` attribute checks
- Optional types `Type | undefined` → `Type | None`
- ES6 modules → Python imports

### Test Framework

- `vitest` → `pytest`
- `test("name", () => { ... })` → `def test_name(): ...`
- `expect(x).toBe(y)` → `assert x == y`
- `expect(x).toBeInstanceOf(Y)` → `assert isinstance(x, Y)`
- `expect(x).toBeUndefined()` → `assert x is None`
- `expect(x).toBeGreaterThan(y)` → `assert x > y`

### Package Management

- `pnpm` → `uv`
- `npm install` → `uv pip install -e .`
- `npm test` → `uv run pytest`
- `node_modules/` → `.venv/`

## Testing

All 14 test cases from the TypeScript version pass in Python:

```bash
uv run pytest
# ====== 14 passed in 0.01s ======
```

## Usage Comparison

### TypeScript
```typescript
import { Engine, Position, OpaqueBlock, Lever, DOWN } from "block";

const sim = new Engine();
sim.setBlock(new Position(0, 0, 0), new OpaqueBlock());
sim.setBlock(new Position(0, 1, 0), new Lever(DOWN));
sim.toggleLever(new Position(0, 1, 0));
sim.tick();
```

### Python
```python
from block_py import Engine, Position, OpaqueBlock, Lever, DOWN

sim = Engine()
sim.set_block(Position(0, 0, 0), OpaqueBlock())
sim.set_block(Position(0, 1, 0), Lever(DOWN))
sim.toggle_lever(Position(0, 1, 0))
sim.tick()
```

## Differences and Design Choices

1. **Object Identity**: Python uses `id()` for object identity instead of WeakMap, which works similarly but isn't garbage-collection aware. This is acceptable since the engine manages block lifecycle explicitly.

2. **Naming Conventions**: Followed Python conventions (snake_case methods instead of camelCase).

3. **Type Hints**: Used Python 3.11+ type hints throughout for clarity and IDE support.

4. **No External Dependencies**: Like the TypeScript version, the Python version has zero runtime dependencies (only pytest for testing).

5. **Literal Types**: Used `typing.Literal` for block type discrimination, which works similarly to TypeScript's string literal types.

## Verification

- ✅ All 14 tests pass
- ✅ All block types implemented (OpaqueBlock, Lever, RedstoneDust, Piston)
- ✅ All engine mechanics working (power, connectivity, piston pushing, etc.)
- ✅ Serialization/deserialization (to_json/from_json)
- ✅ Example scripts working
- ✅ Package structure follows Python best practices


