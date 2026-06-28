/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102a43', navy: '#123c69', ocean: '#176b87', aqua: '#2aa6a4',
        mint: '#dff4ed', cream: '#f7f5ef', coral: '#e96b5b'
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 16px 48px -28px rgba(16,42,67,.35)' }
    }
  },
  plugins: []
}
