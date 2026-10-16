/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--theme-bg)',
          primary: 'var(--theme-primary)',
          'primary-hover': 'var(--theme-primary-hover)',
          light: 'var(--theme-light)',
          lighter: 'var(--theme-lighter)',
          border: 'var(--theme-border)',
        },
        marketing: {
          body: 'var(--marketing-body)',
          surface: 'var(--marketing-surface)',
          'surface-strong': 'var(--marketing-surface-strong)',
          'surface-muted': 'var(--marketing-surface-muted)',
          'surface-alt': 'var(--marketing-surface-alt)',
          border: 'var(--marketing-border)',
          'border-strong': 'var(--marketing-border-strong)',
          primary: 'var(--marketing-primary)',
          'primary-strong': 'var(--marketing-primary-strong)',
          'primary-soft': 'var(--marketing-primary-soft)',
          accent: 'var(--marketing-accent)',
          'accent-soft': 'var(--marketing-accent-soft)',
          text: 'var(--marketing-text)',
          'text-strong': 'var(--marketing-text-strong)',
          'text-muted': 'var(--marketing-text-muted)',
          'text-inverted': 'var(--marketing-text-inverted)',
          success: 'var(--marketing-success)',
          warning: 'var(--marketing-warning)',
          danger: 'var(--marketing-danger)',
          glow: {
            blue: 'var(--marketing-glow-blue)',
            emerald: 'var(--marketing-glow-emerald)',
            purple: 'var(--marketing-glow-purple)',
          },
        },
      },
      boxShadow: {
        'marketing-sm': 'var(--marketing-shadow-sm)',
        'marketing-lg': 'var(--marketing-shadow-lg)',
      },
    },
  },
  plugins: [],
}
