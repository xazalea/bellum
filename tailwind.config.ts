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
          // Catppuccin Frappe-inspired palette
          crust: '#232634',
          mantle: '#292c3c',
          base: '#303446',
          surface0: '#414559',
          surface1: '#51576d',
          surface2: '#626880',
          text: '#c6d0f5',
          subtext0: '#a5adce',
          subtext1: '#b5bfe2',
          blue: '#8caaee',
          lavender: '#babbf1',
          sky: '#99d1db',
          teal: '#81c8be',
          green: '#a6d189',
          yellow: '#e5c890',
          peach: '#ef9f76',
          red: '#e78284',
          pink: '#f4b8e4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
export default config;
