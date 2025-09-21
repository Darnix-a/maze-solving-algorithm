/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors for maze visualization  
        maze: {
          empty: '#ffffff',
          wall: '#2d3748',
          start: '#38a169', 
          goal: '#e53e3e',
          path: '#3182ce',
          explored: '#bee3f8',
          frontier: '#fbb6ce',
          gradient: '#f7fafc',
        }
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
