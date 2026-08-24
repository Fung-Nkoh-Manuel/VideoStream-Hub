/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F2A3D', 900: '#0A1E2C', 800: '#0F2A3D', 700: '#173C55' },
        teal: { DEFAULT: '#2F8FA6', 400: '#7FC4D0', 500: '#2F8FA6', 600: '#237089' },
        amber: { DEFAULT: '#E8963C', 500: '#E8963C', 600: '#CC7A22' },
        slate: { 50: '#F7F9FA', 100: '#EEF2F4', 400: '#8598A6', 500: '#64748B', 700: '#334155' },
        live: '#E14E4E',
        ok: '#2FA679',
        warn: '#E8963C'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,42,61,0.06), 0 1px 12px rgba(15,42,61,0.05)'
      },
      borderRadius: { xl2: '1.25rem' }
    }
  },
  plugins: []
}
