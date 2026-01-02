import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Blue theme colors - sophisticated and modern
        'dark-bg': '#0a1929',        // Very dark blue background
        'dark-card': '#1e293b',      // Dark blue card
        'dark-border': '#334155',    // Blue-gray border
        'dark-text': '#f1f5f9',      // Soft white with blue tint
        'dark-text-secondary': '#94a3b8', // Blue-gray secondary text

        // Light theme colors
        'light-bg': '#f5f5f5',
        'light-card': '#ffffff',
        'light-border': '#e5e5e5',
        'light-text': '#1a1a1a',
        'light-text-secondary': '#6b7280',

        // Accent colors (work in both themes) - enhanced for dark blue theme
        'accent-blue': '#3b82f6',    // Vibrant blue
        'accent-cyan': '#06b6d4',    // Cyan accent
      },
      animation: {
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
