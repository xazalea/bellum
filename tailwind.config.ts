import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nacho: {
          // Vapor-like Deep Navy Palette
          bg: '#050b19',
          surface: 'rgba(17, 28, 52, 0.55)',
          primary: '#e7eefc',
          secondary: '#95a4c6',
          accent: '#4d7cff',
          muted: '#6f81a8',
          border: 'rgba(120, 150, 200, 0.16)',
          'card-hover': 'rgba(17, 28, 52, 0.8)',
        },
        // Legacy mapping
        primary: '#e7eefc',
        'primary-light': '#95a4c6',
        'background-dark': '#050b19',
        'background-card': 'rgba(17, 28, 52, 0.55)',
        surface: 'rgba(17, 28, 52, 0.55)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'nacho': '0.75rem',
        'nacho-lg': '1rem',
        'nacho-sm': '0.375rem',
      },
      boxShadow: {
        'nacho': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'nacho-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
