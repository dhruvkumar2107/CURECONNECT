export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      colors: {
        brand: {
          bg:       '#04091a',
          surface:  '#080f22',
          elevated: '#0d1730',
          overlay:  '#111e3a',
          teal:     '#0d9488',
          'teal-light': '#2dd4bf',
          indigo:   '#6366f1',
          rose:     '#f43f5e',
          amber:    '#f59e0b',
        },
      },
      animation: {
        'shimmer':       'shimmer 1.6s infinite',
        'float':         'float 5s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 2.5s ease-in-out infinite',
        'breathe':       'breathe 4s ease-in-out infinite',
        'slide-up':      'slide-up 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-down':    'slide-down 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':       'fade-in 0.3s ease-out forwards',
        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.22,1,0.36,1) forwards',
        'gradient-shift':'gradient-shift 18s ease infinite',
        'spin-slow':     'spin 3s linear infinite',
        'spin-border':   'spin-border 3s linear infinite',
        'border-glow':   'border-glow 3s ease-in-out infinite',
        'orb-drift-1':   'orb-drift 12s ease-in-out infinite',
        'orb-drift-2':   'orb-drift 16s ease-in-out infinite reverse',
        'heartbeat':     'heartbeat 2s ease-in-out infinite',
        'pulse-dot':     'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '0.7' },
          '50%':      { transform: 'scale(1.08)', opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-scale': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(13, 148, 136, 0.2)' },
          '50%':      { borderColor: 'rgba(13, 148, 136, 0.5)' },
        },
        'orb-drift': {
          '0%':   { transform: 'translate(0, 0)' },
          '33%':  { transform: 'translate(30px, -20px)' },
          '66%':  { transform: 'translate(-20px, 30px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%':      { transform: 'scale(1.15)' },
          '30%':      { transform: 'scale(1)' },
          '45%':      { transform: 'scale(1.08)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.6' },
        },
        'spin-border': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-teal':    '0 0 40px rgba(13,148,136,0.18), 0 0 80px rgba(13,148,136,0.07)',
        'glow-teal-sm': '0 0 20px rgba(13,148,136,0.25)',
        'glow-teal-lg': '0 0 80px rgba(13,148,136,0.2), 0 0 160px rgba(13,148,136,0.08)',
        'glow-rose':    '0 0 30px rgba(244,63,94,0.25)',
        'glow-indigo':  '0 0 40px rgba(99,102,241,0.2)',
        'card':         '0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
        'card-hover':   '0 24px 64px rgba(0,0,0,0.45), 0 0 40px rgba(13,148,136,0.1)',
        'float':        '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(13,148,136,0.06)',
        'inner-glow':   'inset 0 0 40px rgba(13,148,136,0.06)',
      },
      backdropBlur: {
        xs: '4px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
