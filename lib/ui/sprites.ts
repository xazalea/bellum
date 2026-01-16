// High-quality pixel art definitions
// . = transparent
// # = primary (body)
// o = secondary (shadow/detail)
// x = accent (eyes/bright spots)

export type PixelMap = string[];

export const SPRITES = {
  cursor: [
    'x.......',
    'xx......',
    'x.x.....',
    'x..x....',
    'x...x...',
    'x....x..',
    'x.....x.',
    'xxxxxxx.',
    'x.......',
    'x.......',
    'x.......',
  ],
  bubble: [
    '.xx.',
    'x..x',
    'x..x',
    '.xx.',
  ],
  // 32x16 Shark
  shark: [
    '..........................',
    '......................xx..',
    '....................xx#x..',
    '.............xx...xx###x..',
    '.............x#x.x#####x..',
    '......xxxx...x#x.x#####x..',
    '...xxx####xxx#x#x######x..',
    '.xx#############x######x..',
    'x######################x..',
    'x###x##################x..',
    '.xx#x###x##############x..',
    '...xxx##x##xx##########x..',
    '......xxxx#x.x#####xxxx...',
    '..........xx.x####x.......',
    '.............x###x........',
    '.............xxxx.........'
  ],
  // 16x16 Jellyfish
  jellyfish: [
    '.....xxxxxx.....',
    '...xx######xx...',
    '..x##########x..',
    '.x############x.',
    '.x############x.',
    '.x############x.',
    '..x##########x..',
    '...xx######xx...',
    '.....xxxxxx.....',
    '....x#x..x#x....',
    '....x#x..x#x....',
    '....x#x..x#x....',
    '....x#x..x#x....',
    '....x#x..x#x....',
    '....x#x..x#x....',
    '....xxx..xxx....'
  ],
  // 24x16 Turtle
  turtle: [
    '........................',
    '...........xxxxxx.......',
    '.........xx######xx.....',
    '.......xx##########xx...',
    '......x##############x..',
    '.....x################x.',
    '....x##################x',
    '...x###################x',
    '..x###################x.',
    '.x#######xxxxxxx#####x..',
    'x#######x.......x###x...',
    'x######x.........x#x....',
    '.x#####x.........xxx....',
    '..x###x.................',
    '...xxx..................',
    '........................'
  ],
  // 16x12 Fish
  fish: [
    '...........xxx..',
    '.........xx#x...',
    '.......xx###x...',
    '.....xx#####x...',
    '...xx#######x...',
    '.xx#########x...',
    'x###########x...',
    '.xx#########x...',
    '...xx#######x...',
    '.....xx#####x...',
    '.......xx###x...',
    '.........xx#x...',
    '...........xxx..'
  ],
  // 20x20 Octopus
  octopus: [
    '.......xxxxxx.......',
    '.....xx######xx.....',
    '...xx##########xx...',
    '..x##############x..',
    '.x################x.',
    '.x#x############x#x.',
    '.x#x############x#x.',
    '.x################x.',
    '..x##############x..',
    '...xx##########xx...',
    '.....xxxxxxxxxx.....',
    '....x#x..x#x..x#x...',
    '...x#x...x#x...x#x..',
    '..x#x....x#x....x#x.',
    '.x#x.....x#x.....x#x',
    'x#x......x#x......x#',
    'xxx......xxx......xx',
  ]
};

export const PALETTES = {
  default: {
    'x': '#000000', // Outline
    '#': '#ffffff', // Body
    'o': '#cccccc', // Detail
    '.': 'transparent'
  },
  // Dark Ocean Theme
  ocean: {
    'x': '#0F172A', // Dark outline
    '#': '#334155', // Body
    'o': '#1E293B', // Detail
    '.': 'transparent'
  },
  glow: {
    'x': '#94A3B8', // Bright outline
    '#': '#E2E8F0', // Bright body
    'o': '#CBD5E1', // Detail
    '.': 'transparent'
  }
};

/**
 * Converts a pixel map to a Data URL (PNG)
 */
export function createSprite(map: PixelMap, scale: number = 4, palette: Record<string, string> = PALETTES.default): string {
  if (typeof document === 'undefined') return '';

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
