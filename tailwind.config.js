/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Habilitar dark mode con clase
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Botones principales
    'bg-blue-600',
    'hover:bg-blue-700',
    'bg-red-500',
    'hover:bg-red-600',
    'bg-green-500',
    'bg-black',
    'hover:bg-gray-800',
    'bg-white',
    'hover:bg-white/90',
    'bg-gray-400',
    'text-white',
    'text-cyan-700',
    'hover:bg-gray-50',
    'hover:bg-gray-100',
    'border-white/70',
    'hover:bg-white/10',
    // Estados y transiciones
    'transition-colors',
    'transition-all',
    'duration-200',
    'active:scale-95',
    'hover:shadow-md',
    // Focus states
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-blue-500',
    'focus:ring-gray-500',
    'focus:ring-red-500',
    'focus:ring-white/70',
    // Disabled states
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

