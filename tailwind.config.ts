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
          // Dark Deep Ocean Palette
          bg: '#0B1120',         // Deepest ocean blue/black
          surface: '#1E293B',    // Dark slate surface
          primary: '#F8FAFC',    // White/Light Grey text
          secondary: '#94A3B8',  // Muted text
          accent: '#3B82F6',     // Vibrant Blue
          muted: '#64748B',      // Darker muted text
          border: '#334155',     // Dark border
          'card-hover': '#2D3B4F', // Slightly lighter surface for hover
        },
        // Legacy mapping
        primary: '#F8FAFC',
        'primary-light': '#94A3B8',
        'background-dark': '#0B1120',
        'background-card': '#1E293B',
        surface: '#1E293B',
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
