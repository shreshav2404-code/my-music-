/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#141414',
        elevated: '#1E1E1E',
        border: '#2A2A2A',
        primaryText: '#FFFFFF',
        secondaryText: '#A0A0A0',
        mutedText: '#606060',
        accent: '#1DB954',
        danger: '#FF4444',
        success: '#1DB954',
      },
      borderRadius: {
        xxl: '24px',
      },
    },
  },
  plugins: [],
};