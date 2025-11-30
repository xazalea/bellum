/**
 * Design System - Professional UI inspired by vapor.my
 * Modern, sleek, dark theme with glassmorphism effects
 */

export const colors = {
  // Background colors
  bg: {
    primary: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#1a1a1a',
    elevated: '#1f1f1f',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    tertiary: '#808080',
    muted: '#505050',
  },
  
  // Accent colors
  accent: {
    primary: '#00ff88',
    secondary: '#00d4ff',
    tertiary: '#ff6b9d',
    warning: '#ffaa00',
    error: '#ff4444',
  },
  
  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    accent: 'rgba(0, 255, 136, 0.3)',
  },
  
  // Glass effect
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    dark: 'rgba(0, 0, 0, 0.3)',
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
  sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
  md: '0 4px 12px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.4)',
  glow: '0 0 20px rgba(0, 255, 136, 0.3)',
  glowStrong: '0 0 30px rgba(0, 255, 136, 0.5)',
};

export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", "Source Code Pro", monospace',
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

