/**
 * Design System - Matte Dark Blue Theme
 * Inspired by prism.onl / vapor.my but with a matte finish
 */

export const colors = {
  // Background colors - Matte Dark Blues
  bg: {
    primary: '#0B1121',   // Very deep matte blue (almost black)
    secondary: '#151E32', // Deep matte blue
    tertiary: '#1E293B',  // Slate blue surface
    elevated: '#334155',  // Lighter slate for hover/elevated
  },
  
  // Text colors
  text: {
    primary: '#F1F5F9',   // Off-white
    secondary: '#94A3B8', // Muted slate
    tertiary: '#64748B',  // Darker muted slate
    muted: '#475569',
  },
  
  // Accent colors - Muted, sophisticated
  accent: {
    primary: '#38BDF8',   // Sky blue
    secondary: '#818CF8', // Indigo
    tertiary: '#F472B6',  // Muted pink (for subtle highlights)
    quaternary: '#2DD4BF', // Teal
    warning: '#FBBF24',
    error: '#FB7185',
  },
  
  // Border colors
  border: {
    primary: '#1E293B',
    secondary: '#334155',
    accent: 'rgba(56, 189, 248, 0.3)',
  },
  
  // Matte effect (no heavy glass/blur, solid opaque colors)
  matte: {
    light: '#1E293B',
    medium: '#0F172A',
    dark: '#020617',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  glow: '0 0 15px rgba(56, 189, 248, 0.2)', // Subtle blue glow
};

export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
};

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const zIndex = {
  base: 0,
  elevated: 10,
  overlay: 100,
  modal: 200,
  tooltip: 300,
};
