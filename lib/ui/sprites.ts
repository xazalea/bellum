// High-quality pixel art definitions
// . = transparent
// # = primary (body)
// o = secondary (shadow/detail)
// x = accent (eyes/bright spots/outline)
// + = highlight (lighter spots)
// @ = darker shadow

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
    '.+xx.',
    'x..+x',
    'x...x',
    '.xxx.',
  ],
  // 32x16 Enhanced Shark - More anatomical detail
  shark: [
    '............................',
    '.......................xx...',
    '....................xxo#xx..',
    '.............xxx..xx####ox..',
    '.............xo#xx######ox..',
    '......xxxxx..xo#x#######ox..',
    '...xxx#ooo#xxx##x#######ox..',
    '.xx####oooo####x########ox..',
    'x##########x####o#######ox..',
    'x##########o####o#######ox..',
    '.xx###o###x#####o#######ox..',
    '...xxx###x##xxx########oxx..',
    '......xxxx##x..x######xxx...',
    '..........xxx..x#####ox.....',
    '.............x.x####ox......',
    '..............xxxxxx........'
  ],
  // 18x18 Enhanced Jellyfish - More organic
  jellyfish: [
    '.......xxxxxx.......',
    '.....xx#oo###xx.....',
    '....x##oooo###x.....',
    '...x###o##o####x....',
    '..x###########o#x...',
    '..x#############x...',
    '..x#############x...',
    '..x###o#####o###x...',
    '...x###########x....',
    '....x#########x.....',
    '.....xx#####xx......',
    '......xxxxxxx.......',
    '.....x#x.x#x.x#x....',
    '.....x#x.x#x.x#x....',
    '....x#x..x#x..x#x...',
    '....x#x..x#x..x#x...',
    '...x#x...x#x...x#x..',
    '...xxx...xxx...xxx..'
  ],
  // 28x18 Enhanced Turtle - More realistic shell
  turtle: [
    '............................',
    '............xxxxxxx.........',
    '..........xx#ooo##xx........',
    '........xx###oxox###xx......',
    '.......x####ox#xo####ox.....',
    '......x####o#####o####ox....',
    '.....x###################x..',
    '....x###xox###x###xox###ox..',
    '...x####ox####x####ox####x..',
    '..x#####x#####x#####x####x..',
    '..x#######################x.',
    '.x########xxxxxxxxx######x..',
    'x########x.........x####x...',
    'x#######x...........x##x....',
    '.x######x...........xxx.....',
    '..x####x....................',
    '...x##x.....................',
    '....xxx.....................'
  ],
  // 24x16 Realistic Fish - Enhanced detail
  fish: [
    '................xxxxx...',
    '..............xx####ox..',
    '............xx######oox.',
    '..........xx########o+x.',
    '........xx##x#######o+x.',
    '......xx###x########o+x.',
    '....xx#####x########o+x.',
    '...x######x#########o#x.',
    '..x###xx###########oo#x.',
    '.x####x############o##x.',
    'x#####x###########o###x.',
    'x####x###########o####x.',
    '.x##x###########o####x..',
    '..xxx##########o####x...',
    '....xxx#######o###xx....',
    '......xxxxxxxx##xx......'
  ],
  // 24x24 Enhanced Octopus - More detailed tentacles
  octopus: [
    '........xxxxxxxx........',
    '......xx########xx......',
    '.....x############x.....',
    '....x##############x....',
    '...x################x...',
    '..x#x##############x#x..',
    '..x#xo############ox#x..',
    '..x#####oo####oo#####x..',
    '..x##################x..',
    '...x################x...',
    '....x##############x....',
    '.....xx##########xx.....',
    '......xxxx####xxxx......',
    '.....x#x..x##x..x#x.....',
    '....x#x...x##x...x#x....',
    '...x#x....x##x....x#x...',
    '..x#xo....x##x....ox#x..',
    '.x#x......x##x......x#x.',
    '.x#x......x##x......x#x.',
    'x#x.......x##x.......x#x',
    'x#x.......x##x.......x#x',
    'x#xo......x##x......ox#x',
    'xxx.......x##x.......xxx',
    '..........xxxx..........'
  ],
  // 24x20 Manta Ray - New species
  manta: [
    '...x................x...',
    '..x#x..............x#x..',
    '.x##ox............xo##x.',
    'x###o#x..........x#o###x',
    'x####o#x........x#o####x',
    '.x####o#xxxxxxxx#o####x.',
    '..x####o########o####x..',
    '...x################x...',
    '....x##############x....',
    '.....x############x.....',
    '......x##########x......',
    '.......x########x.......',
    '........x######x........',
    '.........x####x.........',
    '.........xo##ox.........',
    '..........x##x..........',
    '..........x##x..........',
    '...........xx...........',
    '...........xx...........',
    '...........xx...........'
  ],
  // 16x16 Seahorse - New species
  seahorse: [
    '......xxx.......',
    '.....x###x......',
    '.....x#o#x......',
    '....x####ox.....',
    '....xo###ox.....',
    '...x######x.....',
    '...x#####ox.....',
    '...x#####x......',
    '....x####x......',
    '....x####x......',
    '....x###ox......',
    '.....x##x.......',
    '.....x##x.......',
    '....x###x.......',
    '....x#ox........',
    '....xxx.........'
  ],
  // 22x14 Realistic Clownfish - Distinctive stripes
  clownfish: [
    '..............xxxxx.....',
    '............xx####ox....',
    '..........xx#######ox...',
    '........xx##x#####x#ox..',
    '......xx###x#####x##ox..',
    '....xx####xxxxxxx###ox..',
    '...x#####xooooox####ox..',
    '..x######xxxxxxx####o#x.',
    '.x######x#####x#####o#x.',
    'x#######x####x######o#x.',
    'x######x###########oo#x.',
    '.x####x###########o##x..',
    '..xxx############o#xx...',
    '....xxxxxxxxxxx##xx.....'
  ],
  // 14x14 Starfish - New species
  starfish: [
    '.......xx......',
    '......x##x.....',
    '.....x####x....',
    '....x######x...',
    'xxx.x##o###x...',
    'x###x######x...',
    'x############xx',
    '.x###o#####o##x',
    '..x##########x.',
    '..x#########x..',
    '...x###x###x...',
    '....x#x.x#x....',
    '.....xx.xx.....',
    '.......x.......'
  ],
  // Ambient ocean elements
  kelp: [
    '...x...',
    '...x...',
    '..x#x..',
    '..x#x..',
    '.x##x..',
    '.x##x..',
    'x###x..',
    'x###x..',
    '.x##x..',
    '.x##x..',
    '..x#x..',
    '..x#x..',
    '...xx..',
    '...x...',
    '...x...'
  ],
  coral_1: [
    '......xxxx......',
    '.....x####x.....',
    '....x######x....',
    '...x##x##x##x...',
    '..x##x.##.x##x..',
    '.x##x..##..x##x.',
    'x##x...##...x##x',
    'x#x....##....x#x',
    'xx.....xx.....xx'
  ],
  coral_2: [
    '....xxx...xxx....',
    '...x###x.x###x...',
    '..x#####x#####x..',
    '..x###########x..',
    '...x#########x...',
    '....x#######x....',
    '.....x#####x.....',
    '......x###x......',
    '.......xxx.......'
  ],
  // Enhanced bubbles with shine
  bubble_small: [
    '.xx.',
    'x+ox',
    'xo.x',
    '.xx.'
  ],
  bubble_medium: [
    '..xxx..',
    '.x++ox.',
    'x+.oox',
    'x+..ox',
    '.xooxx',
    '..xxx.'
  ],
  bubble_large: [
    '...xxxx...',
    '..x+++ox..',
    '.x++.ooxx.',
    'x++..ooox',
    'x+...ooox',
    'x+...ooox',
    '.xoooooxx',
    '..xxxxxo.',
    '...xxxx..'
  ],
  // Plankton particles
  plankton_1: [
    '.x.',
    'x#x',
    '.x.'
  ],
  plankton_2: [
    'x.x',
    '.#.',
    'x.x'
  ],
  // Bioluminescent orbs
  glow_orb: [
    '...xxx...',
    '..x+++x..',
    '.x++#++x.',
    '.x+###+x.',
    'x++###++x',
    '.x+###+x.',
    '.x++#++x.',
    '..x+++x..',
    '...xxx...'
  ],
  // Light rays
  light_ray: [
    'x.....',
    '.x....',
    '..x...',
    '...x..',
    '....x.',
    '.....x'
  ],
  // Ripples
  ripple: [
    '....xxxx....',
    '..xx....xx..',
    '.x........x.',
    'x..........x',
    'x..........x',
    '.x........x.',
    '..xx....xx..',
    '....xxxx....'
  ]
};

export const PALETTES = {
  default: {
    'x': '#000000', // Outline
    '#': '#ffffff', // Body
    'o': '#cccccc', // Detail
    '+': '#ffffff', // Highlight
    '@': '#888888', // Shadow
    '.': 'transparent'
  },
  // Dark Ocean Theme
  ocean: {
    'x': '#0F172A', // Dark outline
    '#': '#334155', // Body
    'o': '#1E293B', // Detail
    '+': '#475569', // Highlight
    '@': '#0A0E14', // Shadow
    '.': 'transparent'
  },
  glow: {
    'x': '#94A3B8', // Bright outline
    '#': '#E2E8F0', // Bright body
    'o': '#CBD5E1', // Detail
    '+': '#F1F5F9', // Highlight
    '@': '#64748B', // Shadow
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
