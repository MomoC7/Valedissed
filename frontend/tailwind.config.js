/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../backend/app/templates/**/*.html",
    "../backend/app/templates/**/*.jinja2",
    "../backend/app/static/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#ff4081', // Ejemplo: Un color rosa para belleza
        'brand-secondary': '#7c4dff',
      }
    },
  },
  plugins: [],
}
