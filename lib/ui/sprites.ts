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
  bubble: [
    '.##.',
    '#..#',
    '#..#',
    '.##.',
  ],
  // 1. Simple Fish
  fish: [
    '......##',
    '....##o#',
    '..##ooo#',
    '##ooooo#',
    '..##ooo#',
    '....##o#',
    '......##',
  ],
  // 2. Jellyfish
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
  // 3. Octopus
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
  // 4. Seahorse
  seahorse: [
    '..##..',
    '.#o.#.',
    '.###..',
    '..##..',
    '..##..',
    '.###..',
    '#..#..',
    '.##...',
  ],
  // 5. Crab
  crab: [
    '.#...#.',
    '.#####.',
    '#o###o#',
    '#######',
    '.#.#.#.',
    '#.....#',
  ],
  // 6. Ray
  ray: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '#..##..#',
    '...##...',
    '...##...',
    '...##...',
  ],
  // 7. Turtle
  turtle: [
    '....##..',
    '..####..',
    '.######.',
    '########',
    '.######.',
    '#.#..#.#',
  ],
  // 8. Eel
  eel: [
    '......#.',
    '.....##.',
    '....##..',
    '...##...',
    '..##....',
    '.##.....',
    '#.......',
  ],
  // 9. Squid
  squid: [
    '..##..',
    '.####.',
    '.####.',
    '.####.',
    '..##..',
    '.#..#.',
    '.#..#.',
    '.#..#.',
  ],
  // 10. Angler
  angler: [
    '....o...',
    '....#...',
    '..#####.',
    '.#oooo##',
    '.#######',
    '..#####.',
  ],
  // 11. Starfish
  starfish: [
    '...#...',
    '..###..',
    '#######',
    '.#.#.#.',
    '#.....#',
  ],
  // 12. Shell
  shell: [
    '..###..',
    '.#####.',
    '#######',
    '.#####.',
    '..###..',
  ],
  // 13. Dolphin (Small)
  dolphin: [
    '.......#',
    '..####.#',
    '.#oooo##',
    '########',
    '.#####..',
  ],
  // 14. Shark (Small)
  shark: [
    '......#.',
    '....###.',
    '.######.',
    '#######.',
    '.......#',
  ],
  // 15. Whale (Small)
  whale: [
    '.....##.',
    '...#####',
    '.#######',
    '########',
    '..####..',
  ],
  // 16. Guppy
  guppy: [
    '...##',
    '.##o#',
    '#ooo#',
    '.##o#',
    '...##',
  ],
  // 17. Neon Tetra
  neon: [
    '....##',
    '..####',
    '######',
    '..####',
    '....##',
  ],
  // 18. Puffer (Unpuffed)
  puffer: [
    '..###..',
    '.#ooo#.',
    '.#####.',
    '..###..',
  ],
  // 19. Shrimp
  shrimp: [
    '..##..',
    '.#..#.',
    '.####.',
    '#....#',
  ],
  // 20. Swordfish
  swordfish: [
    '........#',
    '######..#',
    '.#######.',
    '...####..',
  ],
  // 21. Flatfish
  flatfish: [
    '..####..',
    '.######.',
    '.######.',
    '..####..',
  ],
  // 22. Clam
  clam: [
    '..###..',
    '.#####.',
    '#######',
  ],
  // 23. Anemone (Simple)
  anemone: [
    '#.#.#.#',
    '.#####.',
    '..###..',
  ],
  // 24. Urchin
  urchin: [
    '.#.#.#.',
    '#xxxxx#',
    '.#.#.#.',
  ],
  // 25. Snail
  snail: [
    '..##.',
    '.####',
    '######',
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
