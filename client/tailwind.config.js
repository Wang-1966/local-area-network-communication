/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Mobile breakpoint: < 768px
        'mobile': {'max': '767px'},
        // Tablet breakpoint: 768px - 1023px
        'tablet': {'min': '768px', 'max': '1023px'},
        // Desktop breakpoint: >= 1024px
        'desktop': {'min': '1024px'},
      },
      spacing: {
        // Touch target sizes for mobile (minimum 44x44px recommended)
        'touch': '2.75rem', // 44px
      },
    },
  },
  plugins: [],
}
