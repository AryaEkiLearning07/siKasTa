/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - from SMP Negeri 1 Dlanggu logo
        brand: {
          gold: '#EEDF00',       // Logo crest (for logo only, NOT for text/buttons)
          goldUi: '#9C7A12',     // Gold toned for badges & text accents (WCAG AA compliant)
          goldBg: '#FAEEDA',     // Soft gold background for badges
          green: '#0F6E56',      // PRIMARY - buttons, links, nav active
          greenDark: '#085041',  // Hover/active state
          greenBg: '#EAF3DE',    // Success/lunas badge background
          ink: '#1C1B17',        // Main text (near-black from crest outline)
          cream: '#FBF9F2',      // Page background
          blueInfo: '#2C6E8E',   // Info color (from globe sea)
          blueBg: '#E6F1FB',      // Info background
        },
        // Semantic colors
        success: {
          DEFAULT: '#0F6E56',
          bg: '#EAF3DE',
        },
        warning: {
          DEFAULT: '#9C7A12',
          bg: '#FAEEDA',
        },
        danger: {
          DEFAULT: '#B3261E',
          bg: '#FCEBEB',
        },
        info: {
          DEFAULT: '#2C6E8E',
          bg: '#E6F1FB',
        },
        // Neutral scale
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['1.875rem', { lineHeight: '1.25' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
