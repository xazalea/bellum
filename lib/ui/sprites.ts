// Pixel art definitions using string maps
// '.' = transparent, '#' = primary color, 'x' = secondary color, 'o' = accent

export type PixelMap = string[];

export const SPRITES = {
  cursor: [
    '#.......',
    '##......',
    '#.#.....',
    '#..#....',
    '#...#...',
    '#....#..',
    '#.....#.',
    '#######.',
    '#.......',
    '#.......',
    '#.......',
  ],
  fish: [
    '......##',
    '....##o#',
    '..##ooo#',
    '##ooooo#',
    '..##ooo#',
    '....##o#',
    '......##',
  ],
  jellyfish: [
    '..###..',
    '.#ooo#.',
    '#ooooo#',
    '#ooooo#',
    '.#ooo#.',
    '..#.#..',
    '..#.#..',
    '..#.#..',
  ],
  octopus: [
    '...##...',
    '.######.',
    '#o#..#o#',
    '########',
    '.######.',
    '.#.#.#.',
    '.#.#.#.',
    '..#.#..',
  ],
  bubble: [
    '.##.',
    '#..#',
    '#..#',
    '.##.',
  ]
};

export const PALETTES = {
  default: {
    '#': '#000000',
    'x': '#333333',
    'o': '#666666',
    '.': 'transparent'
  },
  ocean: {
    '#': '#0F172A',
    'x': '#1E293B',
    'o': '#334155',
    '.': 'transparent'
  },
  glow: {
    '#': '#64748B',
    'x': '#475569',
    'o': '#334155',
    '.': 'transparent'
  }
};

/**
 * Converts a pixel map to a Data URL (PNG)
 */
export function createSprite(map: PixelMap, scale: number = 4, palette: Record<string, string> = PALETTES.default): string {
  if (typeof document === 'undefined') return ''; // Server-side guard

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const rows = map.length;
  const cols = map[0].length;

  canvas.width = cols * scale;
  canvas.height = rows * scale;

  map.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      const color = palette[char] || palette['.'];
      if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    });
  });

  return canvas.toDataURL('image/png');
}
