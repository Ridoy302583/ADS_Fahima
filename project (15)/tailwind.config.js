/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6D28D9", // Deep purple
          dark: "#5B21B6",
        },
        secondary: "#10B981", // Emerald
        accent: "#F59E0B", // Amber
        dark: "#111827",
        light: "#F3F4F6",
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
