/**
 * Lucide Icon Resolver
 * Maps string icon names to Lucide React components for dynamic rendering.
 * Used by achievement cards, quest lists, app library, and badges.
 */

import {
  Gamepad2, Target, Trophy, Users, Star, PartyPopper, Bot, Monitor,
  Radio, Zap, Timer, Moon, Cloud, Hash, FileText, Palette,
  Code2, Music, Image, Folder, Terminal, Box, AlertTriangle, Crown,
  Compass, UserPlus, CloudCog, Rocket, Library, Medal, Flame, Coins,
  Diamond, Shield, Eye, Clock, Handshake, Network, Sprout, TreePine,
  Trees, Mountain, CalendarDays, CalendarRange, CirclePlus, CircleMinus,
  PiggyBank, Globe, User, Link2, Check, HelpCircle, Activity,
  Gauge, BarChart3, History, Play, Fingerprint, AlertCircle,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  // Gaming
  gamepad: Gamepad2,
  gamepad2: Gamepad2,
  sports_esports: Gamepad2,
  stadia_controller: Gamepad2,
  games: Gamepad2,

  // Achievements / Rewards
  trophy: Trophy,
  medal: Medal,
  military_tech: Medal,
  award: Medal,
  target: Target,
  star: Star,
  crown: Crown,

  // Social
  users: Users,
  group_add: Users,
  person_add: UserPlus,
  user_plus: UserPlus,
  user: User,
  person: User,
  handshake: Handshake,

  // Compute / Mesh
  network: Network,
  hub: Network,
  cloud: Cloud,
  cloud_sync: CloudCog,
  token: Coins,
  coins: Coins,
  diamond: Diamond,
  zap: Zap,
  bolt: Zap,
  flame: Flame,
  local_fire_department: Flame,
  whatshot: Flame,

  // Explore / Navigation
  compass: Compass,
  explore: Compass,
  link: Link2,
  link2: Link2,

  // Time
  clock: Clock,
  timer: Timer,
  bedtime: Moon,
  moon: Moon,

  // Content / Files
  rocket: Rocket,
  rocket_launch: Rocket,
  library: Library,
  library_add: Library,
  file_text: FileText,
  folder: Folder,
  hash: Hash,
  code: Code2,

  // Media
  music: Music,
  palette: Palette,
  image: Image,
  radio: Radio,

  // Misc
  monitor: Monitor,
  bot: Bot,
  party: PartyPopper,
  terminal: Terminal,
  box: Box,
  bomb: AlertTriangle,
  alert: AlertTriangle,
  alert_circle: AlertCircle,
  shield: Shield,
  eye: Eye,
  help: HelpCircle,
  fingerprint: Fingerprint,
  check: Check,

  // Monitoring
  activity: Activity,
  gauge: Gauge,
  bar_chart: BarChart3,
  history: History,
  play: Play,

  // Nature (for badges/streaks)
  sprout: Sprout,
  tree_pine: TreePine,
  trees: Trees,
  mountain: Mountain,

  // Calendar
  calendar: CalendarDays,
  calendar_days: CalendarDays,
  calendar_range: CalendarRange,

  // Misc UI
  circle_plus: CirclePlus,
  circle_minus: CircleMinus,
  piggy_bank: PiggyBank,
  globe: Globe,
};

/**
 * Get a Lucide icon component by name.
 * Returns Trophy as fallback if name not found.
 */
export function getLucideIcon(name: string): LucideIcon {
  return iconMap[name] ?? Trophy;
}

/**
 * Check if an icon name is registered
 */
export function hasIcon(name: string): boolean {
  return name in iconMap;
}
