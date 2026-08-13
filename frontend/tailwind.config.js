/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(var(--accent-rgb), 0.2)',
        soft: 'var(--shadow-soft)',
      },
      colors: {
        surface: 'var(--surface-1)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-strong)',
        brand: 'var(--accent)',
      },
      backgroundImage: {
        'glass-panel': 'linear-gradient(180deg, var(--glass), var(--glass-strong))',
      },
      keyframes: {
        pulseRing: {
          '0%, 100%': { transform: 'scale(0.95)', opacity: '0.84' },
          '50%': { transform: 'scale(1.08)', opacity: '0.45' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
