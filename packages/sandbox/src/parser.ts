import { Builder, DOWN, EAST, NORTH, SOUTH, UP, WEST, Position, type Block } from 'block';

const DIRS: Record<string, Position> = { 
  east: EAST, west: WEST, north: NORTH, south: SOUTH, up: UP, down: DOWN,
  e: EAST, w: WEST, n: NORTH, s: SOUTH, u: UP, d: DOWN
};

export function parseAndExecute(
  builder: Builder, 
  commands: string,
  markers: Map<string, Block>
): void {
  const lines = commands.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  let lastBlock: Block | null = null;
  
  for (const line of lines) {
    const parts = line.toLowerCase().split(/\s+/);
    const original = line.split(/\s+/);
    const [cmd, ...args] = parts;
    
    switch (cmd) {
      case 'solid':
        lastBlock = builder.solid();
        break;
      case 'dust':
        lastBlock = builder.dust();
        break;
        
      case 'lever': {
        const dir = DIRS[args[0] || ''];
        if (!dir) throw new Error(`Invalid direction: ${args[0]}`);
        lastBlock = builder.lever(dir);
        break;
      }
      
      case 'piston': {
        const dir = DIRS[args[0] || ''];
        if (!dir) throw new Error(`Invalid direction: ${args[0]}`);
        lastBlock = builder.piston(dir);
        break;
      }
        
      case 'move': {
        const dir = DIRS[args[0] || ''];
        if (!dir) throw new Error(`Invalid direction: ${args[0]}`);
        builder.move(dir);
        break;
      }
        
      case 'mark':
        if (!original[1]) throw new Error('mark requires NAME');
        if (lastBlock) {
          markers.set(original[1], lastBlock);
        }
        break;
        
      case 'run':
        builder.run(args[0] ? Number(args[0]) : 1);
        break;
        
      case 'toggle': {
        if (!original[1]) throw new Error('toggle requires id');
        const block = markers.get(original[1]);
        if (!block) throw new Error(`Unknown marker: ${original[1]}`);
        builder.toggle(block);
        break;
      }
        
      case 'remove': {
        if (!original[1]) throw new Error('remove requires id');
        const block = markers.get(original[1]);
        if (!block) throw new Error(`Unknown marker: ${original[1]}`);
        builder.remove(block);
        break;
      }
        
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }
}

