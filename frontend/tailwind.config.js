/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
      },
      colors: {
        primary: '#006976',
        secondary: '#9900cf',
        tertiary: '#286500',
        error: '#ba1a1a',
        background: '#f8f9ff',
        surface: '#f8f9ff',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-surface': '#191c20',
        'primary-container': '#b6f0ff',
        'secondary-container': '#f1c1ff',
        'tertiary-container': '#c1ff9b',
        'surface-container': '#ebedf5',
        'surface-container-high': '#e4e7f0',
        outline: '#70778c',
      },
    },
  },
  plugins: [],
}
