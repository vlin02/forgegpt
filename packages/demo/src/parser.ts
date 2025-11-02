import { Builder, DOWN, EAST, NORTH, SOUTH, UP, WEST, Position } from 'block';

const DIRS: Record<string, Position> = { 
  east: EAST, west: WEST, north: NORTH, south: SOUTH, up: UP, down: DOWN,
  e: EAST, w: WEST, n: NORTH, s: SOUTH, u: UP, d: DOWN
};

const savedPositions = new Map<string, Position>();

export function parseAndExecute(builder: Builder, commands: string): void {
  const lines = commands.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  
  for (const line of lines) {
    const parts = line.toLowerCase().split(/\s+/);
    const original = line.split(/\s+/);
    const [cmd, ...args] = parts;
    
    switch (cmd) {
      case 'solid':
      case 'dust':
        builder[cmd]();
        break;
        
      case 'lever':
      case 'piston': {
        const dir = DIRS[args[0] || ''];
        if (!dir) throw new Error(`Invalid direction: ${args[0]}`);
        builder[cmd](dir);
        break;
      }
        
      case 'move': {
        const dir = DIRS[args[0] || ''];
        if (!dir) throw new Error(`Invalid direction: ${args[0]}`);
        builder.move(dir);
        break;
      }
        
      case 'at': {
        const [x, y, z] = args.map(Number);
        if (x === undefined || y === undefined || z === undefined) {
          throw new Error('at requires 3 coordinates');
        }
        builder.at(x, y, z);
        break;
      }
        
      case 'save':
        if (!original[1]) throw new Error('save requires NAME');
        builder.save(original[1]);
        savedPositions.set(original[1], builder.getCursor());
        break;
        
      case 'goto':
        // goto NAME
        const pos = savedPositions.get(original[1]);
        if (!pos) throw new Error(`Unknown position: ${original[1]}`);
        builder.at(pos.x, pos.y, pos.z);
        break;
        
      case 'run':
        builder.run(args[0] ? Number(args[0]) : 1);
        break;
        
      case 'toggle': {
        if (!original[1]) throw new Error('toggle requires id');
        const block = builder.ref(original[1]);
        builder.toggle(block);
        break;
      }
        
      case 'remove': {
        if (!original[1]) throw new Error('remove requires id');
        const block = builder.ref(original[1]);
        builder.remove(block);
        break;
      }
        
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }
}

