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
          // Challenger Deep Palette
          bg: '#0B0F1A',
          card: '#141A26',
          'card-hover': '#1D2433',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-strong': 'rgba(255, 255, 255, 0.15)',
          primary: '#A8B4D0',
          'primary-hover': '#C0CCE5',
          text: '#E2E8F0',
          subtext: '#94A3B8',
          muted: '#64748B',
          
          // Accents
          'accent-green': '#4ADE80',
          'accent-pink': '#F472B6',
          'accent-grey': '#64748B',
          'accent-blue': '#60A5FA',
        },
        // Legacy/Compatibility mapping
        primary: '#A8B4D0',
        'primary-light': '#C0CCE5',
        'background-dark': '#0B0F1A',
        'background-card': '#141A26',
        surface: '#1D2433',
      },
      fontFamily: {
        sans: ['"VT323"', 'monospace'], // Default body to pixel-ish mono
        display: ['"Press Start 2P"', 'cursive'], // Headers
        body: ['"VT323"', 'monospace'],
        pixel: ['"Press Start 2P"', 'cursive'],
        retro: ['"VT323"', 'monospace'],
      },
      borderRadius: {
        'nacho': '0', // Pixel art usually has sharp corners, or small steps
        'nacho-lg': '0',
        'nacho-sm': '0',
      },
      boxShadow: {
        'nacho': '4px 4px 0px 0px rgba(0, 0, 0, 0.5)', // Hard pixel shadow
        'nacho-hover': '6px 6px 0px 0px rgba(0, 0, 0, 0.5)',
        glow: '0 0 10px rgba(168, 180, 208, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 180, 208, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 180, 208, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  plugins: [],
};
export default config;
