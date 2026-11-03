/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F4ED',
        paper: '#FFFFFF',
        'paper-2': '#FBFAF6',
        ink: '#1A1815',
        'ink-muted': '#6E6A5F',
        border: '#E8E4DB',
        forest: '#1B3A2D',
        'forest-hover': '#2B5240',
        sage: '#E4EDE4',
        'sage-ink': '#3E6B52',
        terracotta: '#C7552E',
        'terracotta-hover': '#A93F1D',
        saffron: '#E9B44C',
        rose: '#B8474B',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,24,21,0.04), 0 4px 16px rgba(26,24,21,0.04)',
        elevated: '0 12px 40px -12px rgba(26,24,21,0.18)',
      },
      borderRadius: {
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};