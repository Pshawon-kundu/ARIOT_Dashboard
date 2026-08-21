/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1769E0',
          dark: '#0F4DB8',
          pale: '#EAF2FF',
          navy: '#13213A',
        },
        ink: {
          DEFAULT: '#13213A',
          secondary: '#667085',
          muted: '#98A2B3',
        },
        app: '#F5F8FC',
        card: '#FFFFFF',
        line: '#E7ECF3',
        success: {
          DEFAULT: '#20A765',
          pale: '#E8F7EF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          pale: '#FFF4DC',
        },
        danger: {
          DEFAULT: '#E5484D',
          pale: '#FDECEC',
        },
        idle: {
          DEFAULT: '#667085',
          pale: '#F2F4F7',
        },
        water: '#2684FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 33, 58, 0.04), 0 1px 3px rgba(19, 33, 58, 0.05)',
        'card-hover': '0 4px 12px rgba(19, 33, 58, 0.07)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}
