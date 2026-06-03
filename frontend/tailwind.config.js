/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest:'#15493B', emerald:'#059669', amber:'#C9882C',
        rust:'#C0392B', ink:'#1a1a1a', paper:'#F9F6EF', cream:'#F0EBE0',
        sage:'#84A98C', gold:'#D4A843', navy:'#1E3A5F',
      },
      fontFamily: { serif:['Georgia','serif'] },
    }
  },
  plugins: [],
};
