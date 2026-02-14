import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
			ocean: {
				bg: '#020b18',
				deep: '#030d1a',
				surface: 'rgba(8, 25, 50, 0.6)',
				card: 'rgba(10, 30, 60, 0.5)',
				'card-hover': 'rgba(15, 40, 75, 0.55)',
				primary: '#c0e8ff',
				text: '#7bb8d8',
				secondary: '#4a8aad',
				accent: '#00ffcc',
				'accent-hover': '#33ffd6',
				muted: '#2a5a7a',
				border: 'rgba(40, 120, 180, 0.15)',
				'border-hover': 'rgba(60, 160, 220, 0.25)',
				glow: 'rgba(0, 255, 204, 0.15)',
				biolum: '#00ccff',
				jellyfish: '#ff66cc',
				coral: '#ff8844',
			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			pixel: ['"Press Start 2P"', 'monospace'],
  			retro: ['"VT323"', 'monospace'],
  			mono: ['"Share Tech Mono"', '"Courier New"', 'monospace'],
  			sans: ['"Share Tech Mono"', 'system-ui', 'sans-serif'],
  			display: ['"Press Start 2P"', 'monospace'],
  			body: ['"Share Tech Mono"', '"VT323"', 'monospace'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.3s ease-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'float': 'float 6s ease-in-out infinite',
  			'swim': 'swim 12s linear infinite',
  			'bob': 'bob 4s ease-in-out infinite',
  			'glow-pulse': 'glowPulse 3s ease-in-out infinite',
  			'bubble-rise': 'bubbleRise 8s linear infinite',
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			slideUp: {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-15px)' },
  			},
  			swim: {
  				'0%': { transform: 'translateX(-100%) translateY(0)' },
  				'25%': { transform: 'translateX(25vw) translateY(-10px)' },
  				'50%': { transform: 'translateX(50vw) translateY(5px)' },
  				'75%': { transform: 'translateX(75vw) translateY(-8px)' },
  				'100%': { transform: 'translateX(calc(100vw + 100%)) translateY(0)' },
  			},
  			bob: {
  				'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
  				'25%': { transform: 'translateY(-8px) rotate(2deg)' },
  				'75%': { transform: 'translateY(8px) rotate(-2deg)' },
  			},
  			glowPulse: {
  				'0%, 100%': { opacity: '0.4', filter: 'blur(8px)' },
  				'50%': { opacity: '0.8', filter: 'blur(12px)' },
  			},
  			bubbleRise: {
  				'0%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0.6' },
  				'50%': { opacity: '0.3' },
  				'100%': { transform: 'translateY(-20px) scale(1)', opacity: '0' },
  			},
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
