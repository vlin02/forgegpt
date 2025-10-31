# Block

Redstone Core v1 simulator

## Block Legend

- `#` / `#15` - Solid block (power level)
- `L-` / `L+` - Lever (off/on)
- `~0` / `~15` - Redstone dust (power level)
- `P|` / `P>` - Piston (retracted/extended)
- `.` - Empty space

## Visualization

### render() - XY Cross-Sections

Shows XY slices for each Z depth, separated by blank lines:

```
L+  ~15 ~15 ~15 P>
#15 #15 #15 #15 .
```

(Top row is higher Y, left to right is X+, separate slices for each Z)

### snapshot() - Coordinate List

Lists all blocks with coordinates:

```
0,0,0 #15
0,1,0 L+
1,1,0 ~15
2,1,0 ~15
3,1,0 ~15
4,1,0 P>
```
